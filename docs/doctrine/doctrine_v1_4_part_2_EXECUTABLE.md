# doctrine_v1_4_part_2_EXECUTABLE

> ⚠️ EXECUTABLE DOCTRINE — ENGINEERING MUST IMPLEMENT EXACTLY AS WRITTEN

Below is the **final, ticket-ready package** for the **4 Hardening Passes** (execution plan \+ concrete artifacts), incorporating your refinements:

- **Version Sovereignty** (`version_id` on traceability nodes \+ batch transformation lifecycle)

- **Monotonic Visibility \+ Regulator “Bypass-Wait”** (regulators can see only after a visibility threshold OR a sanction event)

- **Audit URI / Cold Storage** (`reasoning_hash` becomes a **FK** to `reasoning_logs`, which stores an `audit_uri` pointer)

---

# **FINAL — 4 Hardening Passes**

## **Execution Plan \+ Concrete Artifacts (Copy/Paste for Tickets)**

## **Ticket 0 — Migration Order (Critical)**

**Why:** These passes are circularly dependent; deploy in a strict sequence.

1. Create enums \+ foundational tables (`organizations`, `org_roles`, `reasoning_logs`)

2. Create immutable `events` ledger \+ RLS \+ append-only enforcement

3. Create domain tables (`traceability_*`, `certifications`, `trades`, `escrow_accounts`, `sanctions`)

4. Create transition tables \+ guard functions \+ triggers (state machines)

5. Create DPP export read models (views)

6. Add event payload constraints \+ app JSON Schema validation \+ CI checks

---

## **PASS 1 — Schema-by-Schema SQL Drafting (Supabase RLS \+ JWT Claims)**

### **Ticket 1.1 — JWT Claims (Required)**

**Store custom claims** in JWT at sign-in / session refresh:

- `org_id` (uuid) — required for tenant RLS

- `org_type` (text) — needed for regulator logic

- `roles` (array or csv) — optional if you do RBAC in JWT; otherwise use DB `org_roles`

**RLS fast path:**

`(auth.jwt() ->> 'org_id')::uuid`

---

### **Ticket 1.2 — RLS Baseline Invariants (Template)**

Applies to every tenant-scoped table:

- Must include `org_id uuid not null`

- Must enable RLS

- Must block cross-tenant access

**Template:**

`alter table public.<table> enable row level security;`

`create policy "<table>_select"`  
`on public.<table>`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "<table>_insert"`  
`on public.<table>`  
`for insert`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "<table>_update"`  
`on public.<table>`  
`for update`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "<table>_delete"`  
`on public.<table>`  
`for delete`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

---

### **Ticket 1.3 — SECURITY DEFINER Predicates (Stable Privilege Gates)**

Use SECURITY DEFINER functions for “global/Control Plane” checks so policies don’t embed complex joins.

Example:

`create or replace function public.is_control_plane()`  
`returns boolean`  
`language sql`  
`security definer`  
`as $$`  
 `select (auth.jwt() ->> 'org_type') = 'control_plane';`  
`$$;`

If you don’t want `control_plane` as an org_type, replace with a dedicated table of privileged user IDs checked via `auth.uid()`.

---

## **PASS 2 — State Machine Transition Tables (DB-Level “Physical Laws”)**

### **Ticket 2.1 — Transition Tables per Stateful Domain**

Minimum state machines:

- Trade state machine

- Escrow state machine

- Certification lifecycle state machine

- Batch transformation lifecycle (traceability node “version sovereignty”)

Core rule:

**No direct writes** to state columns except via guarded transitions (trigger or RPC).

---

### **Ticket 2.2 — Maker–Checker (4-Eyes) for Irreversible Moves**

Enforce:

- `maker_id != checker_id`

- transition requires `CHECKER_APPROVAL` event for irreversible transitions

---

## **PASS 3 — Regulator-Facing DPP Export Schema (Read Models)**

### **Ticket 3.1 — DPP Snapshot Views \+ Bundles**

Deliverables:

- `dpp_product_passport` view (per batch)

- Optional `dpp_export_jobs` \+ `dpp_export_items` tables if you want export history/signature bundles

- “Point-in-time” (effective time) support using `effective_at/superseded_at`

---

## **PASS 4 — Event Payload Contracts (JSON Schema \+ DB Guards)**

### **Ticket 4.1 — JSON Schema per Event Type (App-Level)**

- Validate with Ajv (TS) or equivalent

- Enforce versioned schemas with `schema_version`

### **Ticket 4.2 — DB Minimal Guards (Always On)**

- `payload ? 'schema_version'`

- `payload ? 'subject_id'`

- For AI events: require explainability pointer

---

# **Proceeding with baseline enums and generating FULL SQL \+ JSON schemas**

Everything below is **copy/paste**. It implements your artifacts plus the refinements.

---

## **A) Canonical Enums (SQL)**

`-- Hardening Pass 1 & 2: Irreducible Enums`

`create type public.org_type as enum (`  
 `'supplier', 'buyer', 'service_provider', 'regulator', 'certifier', 'logistics_partner'`  
`);`

`create type public.trade_state as enum (`  
 `'draft', 'rfq_negotiating', 'contract_signed', 'escrow_funded',`  
 `'shipped', 'inspected', 'settled', 'disputed', 'cancelled'`  
`);`

`create type public.event_domain as enum ('governance', 'compliance', 'trade', 'ai');`

`create type public.visibility_level as enum ('anonymous', 'shielded', 'public');`

`create type public.cert_status as enum ('pending', 'verified', 'suspended', 'expired');`

`create type public.escrow_state as enum ('held', 'releasable', 'released');`

`create type public.org_status as enum ('active', 'restricted', 'suspended', 'banned');`

---

## **B) Foundation Tables (Organizations, Roles, Reasoning Logs)**

### **`organizations`**

`create table public.organizations (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_type public.org_type not null,`  
 `status public.org_status not null default 'active',`  
 `risk_score numeric not null default 0,`  
 `created_at timestamptz not null default now()`  
`);`

### **`org_roles` (tenant-scoped authorization surface)**

`create table public.org_roles (`  
 `user_id uuid not null references auth.users(id),`  
 `org_id uuid not null references public.organizations(id),`  
 `role text not null,`  
 `assigned_at timestamptz not null default now(),`  
 `primary key (user_id, org_id, role)`  
`);`

### **`reasoning_logs` (cold storage pointer for AI explainability)**

**Key refinement implemented:** `reasoning_hash` is a FK to this table.

`create table public.reasoning_logs (`  
 `id text primary key,                 -- e.g., sha256 hash`  
 `audit_uri text not null,             -- pointer to cold storage (S3/R2/etc)`  
 `storage_tier text not null default 'cold',`  
 `created_at timestamptz not null default now()`  
`);`

The DB stores pointers; the heavy payload lives outside Postgres.

---

## **C) Master Event Ledger (Append-Only \+ RLS \+ Explainability)**

`create table public.events (`  
 `id uuid primary key default gen_random_uuid(),`  
 `event_domain public.event_domain not null,`  
 `event_type text not null,`

`-- Who/where`  
 `org_id uuid not null references public.organizations(id),`  
 `actor_id uuid not null references auth.users(id),`

`-- What/why`  
 `payload jsonb not null,`  
 `schema_version text not null, -- required, indexed, and queryable`  
 `reasoning_hash text null references public.reasoning_logs(id),`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null,`

`-- minimum payload guards (Pass 4 DB-level)`  
 `constraint events_payload_has_subject check (payload ? 'subject_id')`  
`);`

`create index events_org_type_idx on public.events (org_id, event_type, created_at desc);`  
`create index events_subject_idx on public.events (((payload->>'subject_id')::uuid));`

### **Append-only enforcement**

`alter table public.events enable row level security;`

`create policy "events_read_own_org"`  
`on public.events`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "events_insert_own_org"`  
`on public.events`  
`for insert`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`revoke update, delete on public.events from authenticated;`

### **AI explainability guard (Pass 4, DB-level)**

`alter table public.events`  
`add constraint ai_decision_has_explainability`  
`check (`  
 `event_type <> 'AI_DECISION_APPLIED'`  
 `or reasoning_hash is not null`  
 `or (payload ? 'audit_uri')`  
`);`

---

## **D) Traceability Domain (Nodes, Edges, Batch Transformations)**

### **`traceability_nodes` (with `batch_id` \+ `version_id`)**

`create table public.traceability_nodes (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`batch_id uuid not null, -- external batch identity (yarn lot / fabric batch / garment run)`  
 `node_type text not null, -- factory | processor | subcontractor | farm | ginner | spinner | weaver | dyer | etc.`  
 `geo_hash text not null,`

`visibility_level public.visibility_level not null default 'anonymous',`

`-- version sovereignty: used for batch transformation lifecycle`  
 `version_id bigint not null default 1,`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index trace_nodes_org_idx on public.traceability_nodes (org_id);`  
`create index trace_nodes_batch_idx on public.traceability_nodes (batch_id);`

### **Monotonic visibility trigger**

`create or replace function public.enforce_monotonic_visibility()`  
`returns trigger as $$`  
`begin`  
 `if new.visibility_level < old.visibility_level then`  
 `raise exception 'Visibility is monotonic: cannot downgrade from % to %', old.visibility_level, new.visibility_level;`  
 `end if;`  
 `return new;`  
`end;`  
`$$ language plpgsql;`

`create trigger trg_visibility_monotonic`  
`before update of visibility_level on public.traceability_nodes`  
`for each row execute function public.enforce_monotonic_visibility();`

### **`traceability_edges` (cycle avoidance is enforced via app+constraints; DB can add checks per implementation)**

`create table public.traceability_edges (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`from_node_id uuid not null references public.traceability_nodes(id),`  
 `to_node_id uuid not null references public.traceability_nodes(id),`

`material_type text not null,`  
 `created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index trace_edges_to_idx on public.traceability_edges (to_node_id);`  
`create index trace_edges_from_idx on public.traceability_edges (from_node_id);`

### **RLS for traceability tables (tenant-scoped by default)**

`alter table public.traceability_nodes enable row level security;`  
`alter table public.traceability_edges enable row level security;`

`create policy "trace_nodes_select_own_org"`  
`on public.traceability_nodes`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "trace_nodes_write_own_org"`  
`on public.traceability_nodes`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "trace_edges_select_own_org"`  
`on public.traceability_edges`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "trace_edges_write_own_org"`  
`on public.traceability_edges`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

---

## **E) Compliance Domain (Certifications \+ invariants)**

`create table public.certifications (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`cert_type text not null,   -- GOTS | OEKO-TEX | etc.`  
 `issuer text not null,`  
 `valid_to timestamptz not null,`  
 `status public.cert_status not null default 'pending',`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`alter table public.certifications enable row level security;`

`create policy "cert_select_own_org"`  
`on public.certifications`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "cert_write_own_org"`  
`on public.certifications`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

Lifecycle enforcement happens via **evented transitions**. Do not allow ad-hoc status flips without corresponding events (see Event Contracts \+ state machine approach, below).

---

## **F) Trade \+ Escrow Domain (Tables \+ State Machine)**

### **`trades` (with optimistic locking `version_id`)**

`create table public.trades (`  
 `id uuid primary key default gen_random_uuid(),`  
 `buyer_org_id uuid not null references public.organizations(id),`  
 `supplier_org_id uuid not null references public.organizations(id),`

`value numeric not null,`  
 `currency text not null default 'USD',`

`state public.trade_state not null default 'draft',`  
 `version_id bigint not null default 1,`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index trades_buyer_idx on public.trades (buyer_org_id);`  
`create index trades_supplier_idx on public.trades (supplier_org_id);`

### **`escrow_accounts`**

`create table public.escrow_accounts (`  
 `trade_id uuid primary key references public.trades(id),`  
 `org_id uuid not null, -- owning org scope for RLS (typically buyer org)`  
 `amount numeric not null,`  
 `state public.escrow_state not null default 'held',`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index escrow_org_idx on public.escrow_accounts (org_id);`

### **RLS (buyer/supplier can read; scoped writes must be controlled)**

A practical minimum pattern is to scope access to either party:

`alter table public.trades enable row level security;`

`create policy "trades_select_party"`  
`on public.trades`  
`for select`  
`using (`  
 `buyer_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid`  
`);`

`-- Writes should be restricted to controlled RPCs or very narrow policies.`  
`-- If you allow update, consider limiting to draft/rfq states and org ownership checks.`

For `escrow_accounts`, scope to `org_id`:

`alter table public.escrow_accounts enable row level security;`

`create policy "escrow_select_own_org"`  
`on public.escrow_accounts`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "escrow_write_own_org"`  
`on public.escrow_accounts`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

---

### **Trade Transition Rules Table (Pass 2\)**

`create table public.trade_transitions (`  
 `from_state public.trade_state not null,`  
 `to_state public.trade_state not null,`  
 `required_event_type text not null,`  
 `is_irreversible boolean not null default false,`  
 `primary key (from_state, to_state)`  
`);`

`insert into public.trade_transitions (from_state, to_state, required_event_type, is_irreversible) values`  
`('contract_signed', 'escrow_funded', 'PAYMENT_CONFIRMED', false),`  
`('shipped', 'inspected', 'INSPECTION_REPORT_UPLOADED', false),`  
`('inspected', 'settled', 'ESCROW_RELEASE_AUTHORIZED', true);`

### **Guard Trigger Function (Pass 2 \+ Maker–Checker)**

This is your artifact, refined to:

- Validate transition

- Validate prerequisite event exists for **the trade**

- Enforce Maker–Checker for irreversible moves (`CHECKER_APPROVAL` must exist and maker≠checker)

`create or replace function public.enforce_trade_transition()`  
`returns trigger as $$`  
`declare`  
 `required_ev text;`  
 `irreversible boolean;`  
`begin`  
 `-- Optimistic locking requirement (prevents races)`  
 `if new.version_id <> old.version_id + 1 then`  
 `raise exception 'Optimistic lock violation: version_id must increment by 1';`  
 `end if;`

`-- 1) Transition must exist`  
 `select required_event_type, is_irreversible`  
 `into required_ev, irreversible`  
 `from public.trade_transitions`  
 `where from_state = old.state and to_state = new.state;`

`if not found then`  
 `raise exception 'Invalid trade transition: % -> %', old.state, new.state;`  
 `end if;`

`-- 2) Required prerequisite event must exist in ledger for this trade (subject_id = trade.id)`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'trade'`  
 `and e.event_type = required_ev`  
 `and (e.payload->>'subject_id')::uuid = new.id`  
 `) then`  
 `raise exception 'Prerequisite event missing: % required for %', required_ev, new.state;`  
 `end if;`

`-- 3) Maker–Checker for irreversible transitions`  
 `if irreversible then`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'CHECKER_APPROVAL'`  
 `and (e.payload->>'subject_id')::uuid = new.id`  
 `and (e.payload->>'maker_id') is not null`  
 `and (e.payload->>'checker_id') is not null`  
 `and (e.payload->>'maker_id') <> (e.payload->>'checker_id')`  
 `) then`  
 `raise exception 'Maker–Checker violation: independent CHECKER_APPROVAL required for irreversible transition';`  
 `end if;`  
 `end if;`

`return new;`  
`end;`  
`$$ language plpgsql;`

`create trigger trg_enforce_trade_transition`  
`before update of state on public.trades`  
`for each row execute function public.enforce_trade_transition();`

Note: You can strengthen Maker–Checker by requiring the Checker to be from a specific role (e.g., Risk/Compliance) using `org_roles` lookup inside a SECURITY DEFINER function.

---

## **G) Sanctions \+ “Bypass-Wait” Regulator Visibility (Refinement)**

### **`sanctions`**

`create table public.sanctions (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `sanction_type text not null,`  
 `severity int not null default 1,`  
 `applied_at timestamptz not null default now(),`  
 `expires_at timestamptz null`  
`);`

`alter table public.sanctions enable row level security;`

`create policy "sanctions_select_own_org"`  
`on public.sanctions`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

### **Regulator “Bypass-Wait” Rule (RLS extension)**

Requirement:

- Regulator can see a node only if:
  - `visibility_level` is at/above a threshold (e.g., `shielded` or `public`) **OR**

  - A sanction event exists for the node org (or subject)

Because cross-tenant read is involved, implement via **SECURITY DEFINER** function and use it in a policy.

`create or replace function public.can_regulator_read_node(`  
 `node_org_id uuid,`  
 `node_id uuid,`  
 `node_visibility public.visibility_level`  
`) returns boolean`  
`language plpgsql`  
`security definer`  
`as $$`  
`begin`  
 `-- must be regulator`  
 `if (auth.jwt() ->> 'org_type') <> 'regulator' then`  
 `return false;`  
 `end if;`

`-- visibility threshold (bypass-wait)`  
 `if node_visibility in ('shielded','public') then`  
 `return true;`  
 `end if;`

`-- OR sanction event exists (governance: SANCTION_APPLIED) for that org or subject`  
 `if exists (`  
 `select 1 from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'SANCTION_APPLIED'`  
 `and (e.org_id = node_org_id or (e.payload->>'subject_id')::uuid = node_id)`  
 `) then`  
 `return true;`  
 `end if;`

`return false;`  
`end;`  
`$$;`

`-- Add regulator read policy to traceability_nodes`  
`create policy "trace_nodes_regulator_bypass_wait"`  
`on public.traceability_nodes`  
`for select`  
`using (`  
 `public.can_regulator_read_node(org_id, id, visibility_level)`  
`);`

This gives regulators a **controlled, doctrine-compliant** cross-tenant view.

---

## **H) DPP Export Read Model (Pass 3\)**

Your view is solid. Two refinements:

- Use `effective_at/superseded_at` for point-in-time correctness (optional in v1)

- Pull “chain of custody” in a deterministic way

**Baseline DPP view:**

`create or replace view public.dpp_product_passport as`  
`select`  
 `n.batch_id,`  
 `n.org_id,`  
 `n.geo_hash,`  
 `n.visibility_level,`  
 `n.version_id as batch_version_id,`

`jsonb_agg(distinct c.cert_type) filter (where c.status = 'verified') as active_certifications,`

`(`  
 `select jsonb_agg(`  
 `jsonb_build_object(`  
 `'from_node_id', e.from_node_id,`  
 `'to_node_id', e.to_node_id,`  
 `'material_type', e.material_type,`  
 `'effective_at', e.effective_at`  
 `)`  
 `)`  
 `from public.traceability_edges e`  
 `where e.to_node_id = n.id and e.superseded_at is null`  
 `) as supply_chain_lineage,`

`(`  
 `select rl.audit_uri`  
 `from public.events ev`  
 `join public.reasoning_logs rl on rl.id = ev.reasoning_hash`  
 `where ev.event_domain = 'ai'`  
 `and ev.event_type = 'AI_RISK_SCORED'`  
 `and (ev.payload->>'subject_id')::uuid = n.id`  
 `order by ev.created_at desc`  
 `limit 1`  
 `) as last_ai_risk_audit_uri`

`from public.traceability_nodes n`  
`left join public.certifications c`  
 `on c.org_id = n.org_id and c.superseded_at is null`  
`where n.superseded_at is null`  
`group by n.batch_id, n.org_id, n.geo_hash, n.visibility_level, n.version_id;`

This converts “AI transparency pointer” into a **cold-storage URI**, preventing DB bloat.

---

# **I) Canonical Event Types (Baseline set for tickets)**

**Trade**

- `TRADE_CREATED`

- `CONTRACT_SIGNED`

- `PAYMENT_CONFIRMED`

- `ESCROW_RELEASE_AUTHORIZED`

**Compliance**

- `CERTIFICATION_VERIFIED`

- `TC_ISSUED`

- `INSPECTION_REPORT_UPLOADED`

**Governance**

- `KILL_SWITCH_ACTIVATED`

- `DOCTRINE_OVERRIDE`

- `SANCTION_APPLIED`

- `CHECKER_APPROVAL`

**AI**

- `AI_RISK_SCORED`

- `AI_DECISION_APPLIED`

- `AI_DRIFT_DETECTED`

---

# **J) Event Payload Contracts (JSON Schemas) — Textile Manufacturing Baseline**

These are **versioned** and designed for Ajv validation (TS).  
 All require: `schema_version`, `subject_id`, `occurred_at`.

## **1\) `TRADE_CREATED` v1**

`{`  
 `"$id": "texqtic.trade.TRADE_CREATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "buyer_org_id", "supplier_org_id", "value", "currency"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"buyer_org_id": { "type": "string", "format": "uuid" },`  
 `"supplier_org_id": { "type": "string", "format": "uuid" },`  
 `"value": { "type": "number", "minimum": 0 },`  
 `"currency": { "type": "string", "minLength": 3, "maxLength": 3 },`  
 `"trade_type": { "type": "string", "enum": ["low_stakes", "high_stakes"] }`  
 `},`  
 `"additionalProperties": false`  
`}`

## **2\) `PAYMENT_CONFIRMED` v1**

`{`  
 `"$id": "texqtic.trade.PAYMENT_CONFIRMED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "payment_ref", "amount"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"payment_ref": { "type": "string", "minLength": 6 },`  
 `"amount": { "type": "number", "minimum": 0 }`  
 `},`  
 `"additionalProperties": false`  
`}`

## **3\) `INSPECTION_REPORT_UPLOADED` v1**

`{`  
 `"$id": "texqtic.compliance.INSPECTION_REPORT_UPLOADED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "inspection_id", "report_uri", "result"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"inspection_id": { "type": "string", "minLength": 6 },`  
 `"report_uri": { "type": "string", "minLength": 10 },`  
 `"result": { "type": "string", "enum": ["pass", "fail", "conditional"] },`  
 `"notes": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

## **4\) `CERTIFICATION_VERIFIED` v1**

`{`  
 `"$id": "texqtic.compliance.CERTIFICATION_VERIFIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "cert_type", "issuer", "valid_to", "issuer_signature_ref"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"cert_type": { "type": "string" },`  
 `"issuer": { "type": "string" },`  
 `"valid_to": { "type": "string", "format": "date-time" },`  
 `"issuer_signature_ref": { "type": "string", "minLength": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

## **5\) `TC_ISSUED` (Transaction Certificate) v1 — Textile-specific**

`{`  
 `"$id": "texqtic.compliance.TC_ISSUED.v1",`  
 `"type": "object",`  
 `"required": [`  
 `"schema_version", "subject_id", "occurred_at",`  
 `"batch_id", "material", "quantity", "uom",`  
 `"origin_country", "certificate_ref"`  
 `],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`

    `"batch_id": { "type": "string", "format": "uuid" },`
    `"material": { "type": "string" },`
    `"quantity": { "type": "number", "minimum": 0 },`
    `"uom": { "type": "string", "enum": ["kg", "m", "yd", "pcs"] },`

    `"origin_country": { "type": "string", "minLength": 2, "maxLength": 2 },`
    `"certificate_ref": { "type": "string", "minLength": 8 },`

    `"transformations": {`
      `"type": "array",`
      `"items": {`
        `"type": "object",`
        `"required": ["step", "from_form", "to_form"],`
        `"properties": {`
          `"step": { "type": "string", "enum": ["spinning", "weaving", "knitting", "dyeing", "finishing", "cutting", "sewing"] },`
          `"from_form": { "type": "string" },`
          `"to_form": { "type": "string" }`
        `},`
        `"additionalProperties": false`
      `}`
    `}`

`},`  
 `"additionalProperties": false`  
`}`

## **6\) `AI_DECISION_APPLIED` v1 (requires explainability)**

`{`  
 `"$id": "texqtic.ai.AI_DECISION_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "model_id", "decision", "confidence"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"model_id": { "type": "string", "minLength": 3 },`  
 `"decision": { "type": "string" },`  
 `"confidence": { "type": "number", "minimum": 0, "maximum": 1 },`  
 `"audit_uri": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

DB also enforces explainability via `reasoning_hash` FK or `payload.audit_uri`.

---

# **Final Notes for Engineering (Implementation Reality)**

1. **Don’t allow direct state mutation** in app code for `trades.state`, `escrow.state`, `certifications.status`.  
   Use RPC/transition function \+ trigger gates.

2. **Don’t store large reasoning payloads in Postgres.**  
   Store `reasoning_hash` → `reasoning_logs.audit_uri`.

3. **Regulator access is “bypass-wait,” not bypass-now.**  
   Visibility threshold or sanction event is required.

## **Next step (you asked for this explicitly)**

If you reply:  
 **“Proceed with baseline enums and generate the full SQL \+ JSON schemas”**  
 …I will produce the **full consolidated migration** as a single ordered SQL file (ready for Supabase migrations), plus a **complete JSON schema bundle** for all mandatory event types across:

- Yarn → Fabric → Garment transformations

- Batch splitting/merging events (common textile reality)

- Certification lifecycle (issue/verify/suspend/expire)

- Trade lifecycle (RFQ→contract→escrow→ship→inspect→settle/dispute)

- AI risk scoring \+ drift detection \+ human override

No more placeholders—just the complete package.

“Proceed with baseline enums and generate the full SQL \+ JSON schemas”

Absolutely — here is the **full, copy/paste-ready** package:

1. **One consolidated SQL migration** (ordered, Supabase-friendly)

2. **A complete baseline JSON Schema bundle** for textile manufacturing workflows (trade \+ compliance \+ traceability \+ AI \+ governance)

You can drop this into tickets as:

- `000_v1_4_foundation.sql`

- `schemas/*.json`

---

## **1\) Full SQL Migration (Supabase / Postgres)**

Notes:

- Uses **JWT custom claim** `org_id` and `org_type` (`auth.jwt()`).

- Enforces **append-only events**.

- Enforces **state machines** via triggers \+ transition tables.

- Enforces **monotonic visibility**.

- Includes **batch transformation lifecycle** with `version_id`.

- Includes **regulator bypass-wait** via SECURITY DEFINER function.

- Uses **reasoning_logs** for cold-storage explainability pointers.

`-- ============================================================`  
`-- TEXQTIC v1.4 HARDENING PASSES (1-4)`  
`-- Consolidated Migration: Foundation + Events + State Machines + DPP Views + Payload Guards`  
`-- Target: Supabase Postgres`  
`-- ============================================================`

`-- -----------------------------`  
`-- EXTENSIONS`  
`-- -----------------------------`  
`create extension if not exists pgcrypto;`

`-- -----------------------------`  
`-- ENUMS (Baseline)`  
`-- -----------------------------`  
`do $$ begin`  
 `create type public.org_type as enum (`  
 `'supplier', 'buyer', 'service_provider', 'regulator', 'certifier', 'logistics_partner'`  
 `);`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.trade_state as enum (`  
 `'draft', 'rfq_negotiating', 'contract_signed', 'escrow_funded',`  
 `'shipped', 'inspected', 'settled', 'disputed', 'cancelled'`  
 `);`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.event_domain as enum ('governance', 'compliance', 'trade', 'ai', 'traceability');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.visibility_level as enum ('anonymous', 'shielded', 'public');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.cert_status as enum ('pending', 'verified', 'suspended', 'expired');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.escrow_state as enum ('held', 'releasable', 'released');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.org_status as enum ('active', 'restricted', 'suspended', 'banned');`  
`exception when duplicate_object then null; end $$;`

`-- -----------------------------`  
`-- FOUNDATION TABLES`  
`-- -----------------------------`

`-- Organizations`  
`create table if not exists public.organizations (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_type public.org_type not null,`  
 `status public.org_status not null default 'active',`  
 `risk_score numeric not null default 0,`  
 `created_at timestamptz not null default now()`  
`);`

`-- Tenant-scoped roles (Authz)`  
`create table if not exists public.org_roles (`  
 `user_id uuid not null references auth.users(id),`  
 `org_id uuid not null references public.organizations(id),`  
 `role text not null,`  
 `assigned_at timestamptz not null default now(),`  
 `primary key (user_id, org_id, role)`  
`);`

`-- Explainability pointer store (cold storage pointer)`  
`create table if not exists public.reasoning_logs (`  
 `id text primary key,                 -- e.g., sha256`  
 `audit_uri text not null,             -- pointer to cold storage object`  
 `storage_tier text not null default 'cold',`  
 `created_at timestamptz not null default now()`  
`);`

`-- -----------------------------`  
`-- MASTER EVENT LEDGER (Append-only)`  
`-- -----------------------------`  
`create table if not exists public.events (`  
 `id uuid primary key default gen_random_uuid(),`

`event_domain public.event_domain not null,`  
 `event_type text not null,`

`org_id uuid not null references public.organizations(id),`  
 `actor_id uuid not null references auth.users(id),`

`payload jsonb not null,`  
 `schema_version text not null, -- required`  
 `reasoning_hash text null references public.reasoning_logs(id),`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null,`

`constraint events_payload_has_subject check (payload ? 'subject_id')`  
`);`

`create index if not exists events_org_type_idx`  
 `on public.events (org_id, event_type, created_at desc);`

`create index if not exists events_subject_idx`  
 `on public.events (((payload->>'subject_id')::uuid));`

`-- Append-only enforcement`  
`alter table public.events enable row level security;`

`drop policy if exists "events_read_own_org" on public.events;`  
`create policy "events_read_own_org"`  
`on public.events`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "events_insert_own_org" on public.events;`  
`create policy "events_insert_own_org"`  
`on public.events`  
`for insert`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`revoke update, delete on public.events from authenticated;`

`-- AI explainability guard (either reasoning_hash FK OR audit_uri in payload)`  
`do $$ begin`  
 `alter table public.events`  
 `add constraint ai_decision_has_explainability`  
 `check (`  
 `event_type <> 'AI_DECISION_APPLIED'`  
 `or reasoning_hash is not null`  
 `or (payload ? 'audit_uri')`  
 `);`  
`exception when duplicate_object then null; end $$;`

`-- -----------------------------`  
`-- TRACEABILITY DOMAIN (Nodes, Edges, Transformations)`  
`-- -----------------------------`

`create table if not exists public.traceability_nodes (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`batch_id uuid not null,              -- batch identity across transformations`  
 `node_type text not null,             -- spinner/weaver/dyer/finisher/cutter/sewer/etc`  
 `geo_hash text not null,`

`visibility_level public.visibility_level not null default 'anonymous',`

`version_id bigint not null default 1, -- version sovereignty for transformations`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index if not exists trace_nodes_org_idx on public.traceability_nodes (org_id);`  
`create index if not exists trace_nodes_batch_idx on public.traceability_nodes (batch_id);`

`create table if not exists public.traceability_edges (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`from_node_id uuid not null references public.traceability_nodes(id),`  
 `to_node_id uuid not null references public.traceability_nodes(id),`

`material_type text not null,`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index if not exists trace_edges_to_idx on public.traceability_edges (to_node_id);`  
`create index if not exists trace_edges_from_idx on public.traceability_edges (from_node_id);`

`-- RLS for traceability tables`  
`alter table public.traceability_nodes enable row level security;`  
`alter table public.traceability_edges enable row level security;`

`drop policy if exists "trace_nodes_select_own_org" on public.traceability_nodes;`  
`create policy "trace_nodes_select_own_org"`  
`on public.traceability_nodes`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "trace_nodes_write_own_org" on public.traceability_nodes;`  
`create policy "trace_nodes_write_own_org"`  
`on public.traceability_nodes`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "trace_edges_select_own_org" on public.traceability_edges;`  
`create policy "trace_edges_select_own_org"`  
`on public.traceability_edges`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "trace_edges_write_own_org" on public.traceability_edges;`  
`create policy "trace_edges_write_own_org"`  
`on public.traceability_edges`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- Monotonic visibility`  
`create or replace function public.enforce_monotonic_visibility()`  
`returns trigger as $$`  
`begin`  
 `if new.visibility_level < old.visibility_level then`  
 `raise exception 'Visibility is monotonic: cannot downgrade from % to %', old.visibility_level, new.visibility_level;`  
 `end if;`  
 `return new;`  
`end;`  
`$$ language plpgsql;`

`drop trigger if exists trg_visibility_monotonic on public.traceability_nodes;`  
`create trigger trg_visibility_monotonic`  
`before update of visibility_level on public.traceability_nodes`  
`for each row execute function public.enforce_monotonic_visibility();`

`-- -----------------------------`  
`-- COMPLIANCE DOMAIN (Certifications + Inspection records)`  
`-- -----------------------------`

`create table if not exists public.certifications (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`

`cert_type text not null,          -- GOTS | OEKO-TEX | etc.`  
 `issuer text not null,`  
 `valid_to timestamptz not null,`  
 `status public.cert_status not null default 'pending',`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`alter table public.certifications enable row level security;`

`drop policy if exists "cert_select_own_org" on public.certifications;`  
`create policy "cert_select_own_org"`  
`on public.certifications`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "cert_write_own_org" on public.certifications;`  
`create policy "cert_write_own_org"`  
`on public.certifications`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- Optional: inspection table (referenced by events)`  
`create table if not exists public.inspections (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `trade_id uuid null, -- may link to trade`  
 `batch_id uuid null, -- may link to traceability batch`  
 `report_uri text not null,`  
 `result text not null check (result in ('pass','fail','conditional')),`  
 `created_at timestamptz not null default now()`  
`);`

`alter table public.inspections enable row level security;`

`drop policy if exists "insp_select_own_org" on public.inspections;`  
`create policy "insp_select_own_org"`  
`on public.inspections`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "insp_write_own_org" on public.inspections;`  
`create policy "insp_write_own_org"`  
`on public.inspections`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- -----------------------------`  
`-- TRADE + ESCROW DOMAIN`  
`-- -----------------------------`

`create table if not exists public.trades (`  
 `id uuid primary key default gen_random_uuid(),`

`buyer_org_id uuid not null references public.organizations(id),`  
 `supplier_org_id uuid not null references public.organizations(id),`

`value numeric not null,`  
 `currency text not null default 'USD',`

`state public.trade_state not null default 'draft',`  
 `version_id bigint not null default 1,`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index if not exists trades_buyer_idx on public.trades (buyer_org_id);`  
`create index if not exists trades_supplier_idx on public.trades (supplier_org_id);`

`create table if not exists public.escrow_accounts (`  
 `trade_id uuid primary key references public.trades(id),`  
 `org_id uuid not null, -- usually buyer org for RLS scoping`  
 `amount numeric not null,`  
 `state public.escrow_state not null default 'held',`

`created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null`  
`);`

`create index if not exists escrow_org_idx on public.escrow_accounts (org_id);`

`-- RLS: trades are shared between parties (read)`  
`alter table public.trades enable row level security;`

`drop policy if exists "trades_select_party" on public.trades;`  
`create policy "trades_select_party"`  
`on public.trades`  
`for select`  
`using (`  
 `buyer_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid`  
`);`

`-- Writes should be done via controlled RPC/state transition paths.`  
`-- If you need minimal update rights in early phases, restrict to states and party ownership.`  
`drop policy if exists "trades_update_limited_party" on public.trades;`  
`create policy "trades_update_limited_party"`  
`on public.trades`  
`for update`  
`using (`  
 `(buyer_org_id = (auth.jwt() ->> 'org_id')::uuid or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid)`  
 `and state in ('draft','rfq_negotiating')`  
`)`  
`with check (`  
 `(buyer_org_id = (auth.jwt() ->> 'org_id')::uuid or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`);`

`-- Escrow RLS scoped by org_id`  
`alter table public.escrow_accounts enable row level security;`

`drop policy if exists "escrow_select_own_org" on public.escrow_accounts;`  
`create policy "escrow_select_own_org"`  
`on public.escrow_accounts`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`drop policy if exists "escrow_write_own_org" on public.escrow_accounts;`  
`create policy "escrow_write_own_org"`  
`on public.escrow_accounts`  
`for all`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid)`  
`with check (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- -----------------------------`  
`-- SANCTIONS (for bypass-wait logic + governance)`  
`-- -----------------------------`  
`create table if not exists public.sanctions (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `sanction_type text not null,`  
 `severity int not null default 1,`  
 `applied_at timestamptz not null default now(),`  
 `expires_at timestamptz null`  
`);`

`alter table public.sanctions enable row level security;`

`drop policy if exists "sanctions_select_own_org" on public.sanctions;`  
`create policy "sanctions_select_own_org"`  
`on public.sanctions`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- -----------------------------`  
`-- REGULATOR BYPASS-WAIT (Controlled cross-tenant visibility)`  
`-- -----------------------------`  
`create or replace function public.can_regulator_read_node(`  
 `node_org_id uuid,`  
 `node_id uuid,`  
 `node_visibility public.visibility_level`  
`) returns boolean`  
`language plpgsql`  
`security definer`  
`as $$`  
`begin`  
 `if (auth.jwt() ->> 'org_type') <> 'regulator' then`  
 `return false;`  
 `end if;`

`-- visible once shielded/public`  
 `if node_visibility in ('shielded','public') then`  
 `return true;`  
 `end if;`

`-- visible earlier if sanctioned (org or subject)`  
 `if exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'SANCTION_APPLIED'`  
 `and (e.org_id = node_org_id or (e.payload->>'subject_id')::uuid = node_id)`  
 `) then`  
 `return true;`  
 `end if;`

`return false;`  
`end;`  
`$$;`

`drop policy if exists "trace_nodes_regulator_bypass_wait" on public.traceability_nodes;`  
`create policy "trace_nodes_regulator_bypass_wait"`  
`on public.traceability_nodes`  
`for select`  
`using (public.can_regulator_read_node(org_id, id, visibility_level));`

`-- -----------------------------`  
`-- PASS 2: STATE MACHINES (Transitions + Guards)`  
`-- -----------------------------`

`-- Trade transitions table`  
`create table if not exists public.trade_transitions (`  
 `from_state public.trade_state not null,`  
 `to_state public.trade_state not null,`  
 `required_event_type text not null,`  
 `is_irreversible boolean not null default false,`  
 `primary key (from_state, to_state)`  
`);`

`-- Seed minimal transition rules (idempotent insert)`  
`insert into public.trade_transitions (from_state, to_state, required_event_type, is_irreversible)`  
`values`  
`('contract_signed', 'escrow_funded', 'PAYMENT_CONFIRMED', false),`  
`('shipped', 'inspected', 'INSPECTION_REPORT_UPLOADED', false),`  
`('inspected', 'settled', 'ESCROW_RELEASE_AUTHORIZED', true)`  
`on conflict do nothing;`

`-- Guard function for trade transitions (includes optimistic lock + maker-checker)`  
`create or replace function public.enforce_trade_transition()`  
`returns trigger as $$`  
`declare`  
 `required_ev text;`  
 `irreversible boolean;`  
`begin`  
 `-- optimistic locking`  
 `if new.version_id <> old.version_id + 1 then`  
 `raise exception 'Optimistic lock violation: version_id must increment by 1';`  
 `end if;`

`-- validate transition exists`  
 `select required_event_type, is_irreversible`  
 `into required_ev, irreversible`  
 `from public.trade_transitions`  
 `where from_state = old.state and to_state = new.state;`

`if not found then`  
 `raise exception 'Invalid trade transition: % -> %', old.state, new.state;`  
 `end if;`

`-- prerequisite event must exist for this trade`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'trade'`  
 `and e.event_type = required_ev`  
 `and (e.payload->>'subject_id')::uuid = new.id`  
 `) then`  
 `raise exception 'Prerequisite event missing: % required for %', required_ev, new.state;`  
 `end if;`

`-- irreversible transitions require CHECKER_APPROVAL w/ maker != checker`  
 `if irreversible then`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'CHECKER_APPROVAL'`  
 `and (e.payload->>'subject_id')::uuid = new.id`  
 `and (e.payload->>'maker_id') is not null`  
 `and (e.payload->>'checker_id') is not null`  
 `and (e.payload->>'maker_id') <> (e.payload->>'checker_id')`  
 `) then`  
 `raise exception 'Maker–Checker violation: independent CHECKER_APPROVAL required';`  
 `end if;`  
 `end if;`

`return new;`  
`end;`  
`$$ language plpgsql;`

`drop trigger if exists trg_enforce_trade_transition on public.trades;`  
`create trigger trg_enforce_trade_transition`  
`before update of state on public.trades`  
`for each row execute function public.enforce_trade_transition();`

`-- -----------------------------`  
`-- PASS 3: DPP READ MODEL (Baseline View)`  
`-- -----------------------------`  
`create or replace view public.dpp_product_passport as`  
`select`  
 `n.batch_id,`  
 `n.org_id,`  
 `n.geo_hash,`  
 `n.visibility_level,`  
 `n.version_id as batch_version_id,`

`jsonb_agg(distinct c.cert_type) filter (where c.status = 'verified') as active_certifications,`

`(`  
 `select jsonb_agg(`  
 `jsonb_build_object(`  
 `'from_node_id', e.from_node_id,`  
 `'to_node_id', e.to_node_id,`  
 `'material_type', e.material_type,`  
 `'effective_at', e.effective_at`  
 `)`  
 `)`  
 `from public.traceability_edges e`  
 `where e.to_node_id = n.id`  
 `and e.superseded_at is null`  
 `) as supply_chain_lineage,`

`(`  
 `select rl.audit_uri`  
 `from public.events ev`  
 `join public.reasoning_logs rl on rl.id = ev.reasoning_hash`  
 `where ev.event_domain = 'ai'`  
 `and ev.event_type = 'AI_RISK_SCORED'`  
 `and (ev.payload->>'subject_id')::uuid = n.id`  
 `order by ev.created_at desc`  
 `limit 1`  
 `) as last_ai_risk_audit_uri`

`from public.traceability_nodes n`  
`left join public.certifications c`  
 `on c.org_id = n.org_id`  
 `and c.superseded_at is null`  
`where n.superseded_at is null`  
`group by n.batch_id, n.org_id, n.geo_hash, n.visibility_level, n.version_id;`

`-- ============================================================`  
`-- END MIGRATION`  
`-- ============================================================`

---

## **2\) Full JSON Schema Bundle (Textile Manufacturing Baseline)**

**Conventions**

- All payloads require:
  - `schema_version`

  - `subject_id` (uuid)

  - `occurred_at` (date-time)

- Use Ajv for validation.

- Namespaced `$id`s.

- `additionalProperties: false` to eliminate “Supply Chain Ghosts”.

### **Directory Layout**

`schemas/`  
 `common/base_event.v1.json`  
 `trade/`  
 `TRADE_CREATED.v1.json`  
 `RFQ_UPDATED.v1.json`  
 `CONTRACT_SIGNED.v1.json`  
 `PAYMENT_CONFIRMED.v1.json`  
 `SHIPMENT_MARKED.v1.json`  
 `DISPUTE_OPENED.v1.json`  
 `ESCROW_RELEASE_AUTHORIZED.v1.json`  
 `compliance/`  
 `CERTIFICATION_VERIFIED.v1.json`  
 `CERTIFICATION_SUSPENDED.v1.json`  
 `INSPECTION_REPORT_UPLOADED.v1.json`  
 `TC_ISSUED.v1.json`  
 `traceability/`  
 `BATCH_CREATED.v1.json`  
 `BATCH_TRANSFORMED.v1.json`  
 `BATCH_SPLIT.v1.json`  
 `BATCH_MERGED.v1.json`  
 `TRACE_EDGE_ADDED.v1.json`  
 `governance/`  
 `CHECKER_APPROVAL.v1.json`  
 `SANCTION_APPLIED.v1.json`  
 `KILL_SWITCH_ACTIVATED.v1.json`  
 `DOCTRINE_OVERRIDE.v1.json`  
 `ai/`  
 `AI_RISK_SCORED.v1.json`  
 `AI_DECISION_APPLIED.v1.json`  
 `AI_DRIFT_DETECTED.v1.json`  
 `AI_OVERRIDE_BY_HUMAN.v1.json`

---

### **`common/base_event.v1.json`**

`{`  
 `"$id": "texqtic.common.base_event.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" }`  
 `},`  
 `"additionalProperties": true`  
`}`

---

## **TRADE**

### **`trade/TRADE_CREATED.v1.json`**

`{`  
 `"$id": "texqtic.trade.TRADE_CREATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "buyer_org_id", "supplier_org_id", "value", "currency", "trade_type"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"buyer_org_id": { "type": "string", "format": "uuid" },`  
 `"supplier_org_id": { "type": "string", "format": "uuid" },`  
 `"trade_type": { "type": "string", "enum": ["low_stakes", "high_stakes"] },`  
 `"value": { "type": "number", "minimum": 0 },`  
 `"currency": { "type": "string", "minLength": 3, "maxLength": 3 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/RFQ_UPDATED.v1.json`**

`{`  
 `"$id": "texqtic.trade.RFQ_UPDATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "rfq_version", "items"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"rfq_version": { "type": "integer", "minimum": 1 },`  
 `"items": {`  
 `"type": "array",`  
 `"minItems": 1,`  
 `"items": {`  
 `"type": "object",`  
 `"required": ["material", "quantity", "uom"],`  
 `"properties": {`  
 `"material": { "type": "string" },`  
 `"quantity": { "type": "number", "minimum": 0 },`  
 `"uom": { "type": "string", "enum": ["kg", "m", "yd", "pcs"] }`  
 `},`  
 `"additionalProperties": false`  
 `}`  
 `}`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/CONTRACT_SIGNED.v1.json`**

`{`  
 `"$id": "texqtic.trade.CONTRACT_SIGNED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "contract_uri", "signing_parties"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"contract_uri": { "type": "string", "minLength": 10 },`  
 `"signing_parties": {`  
 `"type": "array",`  
 `"minItems": 2,`  
 `"items": { "type": "string", "format": "uuid" }`  
 `}`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/PAYMENT_CONFIRMED.v1.json`**

`{`  
 `"$id": "texqtic.trade.PAYMENT_CONFIRMED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "payment_ref", "amount"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"payment_ref": { "type": "string", "minLength": 6 },`  
 `"amount": { "type": "number", "minimum": 0 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/SHIPMENT_MARKED.v1.json`**

`{`  
 `"$id": "texqtic.trade.SHIPMENT_MARKED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "carrier", "tracking_number", "ship_date"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"carrier": { "type": "string" },`  
 `"tracking_number": { "type": "string", "minLength": 5 },`  
 `"ship_date": { "type": "string", "format": "date-time" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/DISPUTE_OPENED.v1.json`**

`{`  
 `"$id": "texqtic.trade.DISPUTE_OPENED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "reason_code", "description"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"reason_code": { "type": "string" },`  
 `"description": { "type": "string", "minLength": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`trade/ESCROW_RELEASE_AUTHORIZED.v1.json`**

`{`  
 `"$id": "texqtic.trade.ESCROW_RELEASE_AUTHORIZED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "amount", "currency", "inspection_event_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"amount": { "type": "number", "minimum": 0 },`  
 `"currency": { "type": "string", "minLength": 3, "maxLength": 3 },`  
 `"inspection_event_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

---

## **COMPLIANCE**

### **`compliance/INSPECTION_REPORT_UPLOADED.v1.json`**

`{`  
 `"$id": "texqtic.compliance.INSPECTION_REPORT_UPLOADED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "inspection_id", "report_uri", "result"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"inspection_id": { "type": "string", "minLength": 6 },`  
 `"report_uri": { "type": "string", "minLength": 10 },`  
 `"result": { "type": "string", "enum": ["pass", "fail", "conditional"] },`  
 `"notes": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`compliance/CERTIFICATION_VERIFIED.v1.json`**

`{`  
 `"$id": "texqtic.compliance.CERTIFICATION_VERIFIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "cert_type", "issuer", "valid_to", "issuer_signature_ref"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"cert_type": { "type": "string" },`  
 `"issuer": { "type": "string" },`  
 `"valid_to": { "type": "string", "format": "date-time" },`  
 `"issuer_signature_ref": { "type": "string", "minLength": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`compliance/CERTIFICATION_SUSPENDED.v1.json`**

`{`  
 `"$id": "texqtic.compliance.CERTIFICATION_SUSPENDED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "reason", "issuer_signature_ref"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"reason": { "type": "string", "minLength": 5 },`  
 `"issuer_signature_ref": { "type": "string", "minLength": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`compliance/TC_ISSUED.v1.json`**

`{`  
 `"$id": "texqtic.compliance.TC_ISSUED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "batch_id", "material", "quantity", "uom", "origin_country", "certificate_ref"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"material": { "type": "string" },`  
 `"quantity": { "type": "number", "minimum": 0 },`  
 `"uom": { "type": "string", "enum": ["kg", "m", "yd", "pcs"] },`  
 `"origin_country": { "type": "string", "minLength": 2, "maxLength": 2 },`  
 `"certificate_ref": { "type": "string", "minLength": 8 },`  
 `"transformations": {`  
 `"type": "array",`  
 `"items": {`  
 `"type": "object",`  
 `"required": ["step", "from_form", "to_form"],`  
 `"properties": {`  
 `"step": { "type": "string", "enum": ["spinning", "weaving", "knitting", "dyeing", "finishing", "cutting", "sewing"] },`  
 `"from_form": { "type": "string" },`  
 `"to_form": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
 `}`  
 `}`  
 `},`  
 `"additionalProperties": false`  
`}`

---

## **TRACEABILITY (Batch-level textile reality)**

### **`traceability/BATCH_CREATED.v1.json`**

`{`  
 `"$id": "texqtic.traceability.BATCH_CREATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "batch_id", "material_form", "quantity", "uom"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"material_form": { "type": "string", "enum": ["fiber", "yarn", "fabric", "garment"] },`  
 `"quantity": { "type": "number", "minimum": 0 },`  
 `"uom": { "type": "string", "enum": ["kg", "m", "yd", "pcs"] }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`traceability/BATCH_TRANSFORMED.v1.json`**

`{`  
 `"$id": "texqtic.traceability.BATCH_TRANSFORMED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "batch_id", "from_form", "to_form", "process", "input_batches", "output_batch_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"from_form": { "type": "string", "enum": ["fiber", "yarn", "fabric"] },`  
 `"to_form": { "type": "string", "enum": ["yarn", "fabric", "garment"] },`  
 `"process": { "type": "string", "enum": ["spinning", "weaving", "knitting", "dyeing", "finishing", "cutting", "sewing"] },`  
 `"input_batches": {`  
 `"type": "array",`  
 `"minItems": 1,`  
 `"items": { "type": "string", "format": "uuid" }`  
 `},`  
 `"output_batch_id": { "type": "string", "format": "uuid" },`  
 `"yield_ratio": { "type": "number", "minimum": 0, "maximum": 2 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`traceability/BATCH_SPLIT.v1.json`**

`{`  
 `"$id": "texqtic.traceability.BATCH_SPLIT.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "source_batch_id", "child_batches"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"source_batch_id": { "type": "string", "format": "uuid" },`  
 `"child_batches": {`  
 `"type": "array",`  
 `"minItems": 2,`  
 `"items": {`  
 `"type": "object",`  
 `"required": ["batch_id", "quantity", "uom"],`  
 `"properties": {`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"quantity": { "type": "number", "minimum": 0 },`  
 `"uom": { "type": "string", "enum": ["kg", "m", "yd", "pcs"] }`  
 `},`  
 `"additionalProperties": false`  
 `}`  
 `}`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`traceability/BATCH_MERGED.v1.json`**

`{`  
 `"$id": "texqtic.traceability.BATCH_MERGED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "source_batches", "merged_batch_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"source_batches": {`  
 `"type": "array",`  
 `"minItems": 2,`  
 `"items": { "type": "string", "format": "uuid" }`  
 `},`  
 `"merged_batch_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`traceability/TRACE_EDGE_ADDED.v1.json`**

`{`  
 `"$id": "texqtic.traceability.TRACE_EDGE_ADDED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "from_node_id", "to_node_id", "material_type"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"from_node_id": { "type": "string", "format": "uuid" },`  
 `"to_node_id": { "type": "string", "format": "uuid" },`  
 `"material_type": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

---

## **GOVERNANCE**

### **`governance/CHECKER_APPROVAL.v1.json`**

`{`  
 `"$id": "texqtic.governance.CHECKER_APPROVAL.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "maker_id", "checker_id", "action"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"maker_id": { "type": "string", "format": "uuid" },`  
 `"checker_id": { "type": "string", "format": "uuid" },`  
 `"action": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`governance/SANCTION_APPLIED.v1.json`**

`{`  
 `"$id": "texqtic.governance.SANCTION_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "org_id", "sanction_type", "severity"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"org_id": { "type": "string", "format": "uuid" },`  
 `"sanction_type": { "type": "string" },`  
 `"severity": { "type": "integer", "minimum": 1, "maximum": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`governance/KILL_SWITCH_ACTIVATED.v1.json`**

`{`  
 `"$id": "texqtic.governance.KILL_SWITCH_ACTIVATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "switch_type", "scope", "mode"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"switch_type": { "type": "string", "enum": ["transaction", "certification", "ai", "tenant", "jurisdiction", "platform"] },`  
 `"scope": { "type": "string" },`  
 `"mode": { "type": "string", "enum": ["read_only", "approval_only"] }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`governance/DOCTRINE_OVERRIDE.v1.json`**

`{`  
 `"$id": "texqtic.governance.DOCTRINE_OVERRIDE.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "override_reason", "maker_id", "checker_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"override_reason": { "type": "string", "minLength": 10 },`  
 `"maker_id": { "type": "string", "format": "uuid" },`  
 `"checker_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

---

## **AI**

### **`ai/AI_RISK_SCORED.v1.json`**

`{`  
 `"$id": "texqtic.ai.AI_RISK_SCORED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "model_id", "risk_score", "confidence"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"model_id": { "type": "string" },`  
 `"risk_score": { "type": "number", "minimum": 0, "maximum": 100 },`  
 `"confidence": { "type": "number", "minimum": 0, "maximum": 1 },`  
 `"audit_uri": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`ai/AI_DECISION_APPLIED.v1.json`**

`{`  
 `"$id": "texqtic.ai.AI_DECISION_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "model_id", "decision", "confidence"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"model_id": { "type": "string" },`  
 `"decision": { "type": "string" },`  
 `"confidence": { "type": "number", "minimum": 0, "maximum": 1 },`  
 `"audit_uri": { "type": "string" }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`ai/AI_OVERRIDE_BY_HUMAN.v1.json`**

`{`  
 `"$id": "texqtic.ai.AI_OVERRIDE_BY_HUMAN.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "model_id", "reason"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"model_id": { "type": "string" },`  
 `"reason": { "type": "string", "minLength": 5 }`  
 `},`  
 `"additionalProperties": false`  
`}`

### **`ai/AI_DRIFT_DETECTED.v1.json`**

`{`  
 `"$id": "texqtic.ai.AI_DRIFT_DETECTED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "model_id", "signal", "severity"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"model_id": { "type": "string" },`  
 `"signal": { "type": "string" },`  
 `"severity": { "type": "integer", "minimum": 1, "maximum": 10 }`  
 `},`  
 `"additionalProperties": false`  
`}`

---

# **What engineering can ticket immediately**

### **Ticket bundle A — DB Migration**

- Apply the SQL migration exactly as provided.

- Confirm JWT claims are present in session tokens (`org_id`, `org_type`).

### **Ticket bundle B — Event validation in app**

- Add Ajv validation per `event_type`.

- Reject any event missing required keys (no “partial payloads”).

### **Ticket bundle C — Transition enforcement**

- Ensure trade state updates increment `version_id` and only occur when prerequisite events are written.

### **Ticket bundle D — Cold storage explainability**

- Create `reasoning_logs` objects for AI events

- Store `reasoning_hash` FK in `events`

Below are **copy/paste** engineering artifacts:

1. **A single TypeScript `eventSchemas` registry** (map `event_type` → JSON Schema) \+ **Ajv validator helper**

2. **A Supabase Edge Function** example `emit_event()` that enforces:
   - schema validation (Ajv)

   - org scoping (JWT `org_id`)

   - maker–checker for irreversible event types (4-eyes; maker \!= checker)

These are written to be dropped into your repo with minimal edits.

---

## **1\) TypeScript `eventSchemas` registry \+ Ajv validator helper**

### **`src/events/schemas.ts`**

`// src/events/schemas.ts`  
`// Single registry: event_type -> JSON Schema (Ajv v8 compatible)`

`import type { JSONSchemaType } from "ajv";`

`// Minimal shared base keys for all payloads.`  
`const base = {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `},`  
`} as const;`

`// Helper to build schemas with strict additionalProperties=false by default.`  
`function makeSchema(schema: any) {`  
 `return {`  
 `...schema,`  
 `additionalProperties: false,`  
 `};`  
`}`

`// -------------------`  
`// TRADE`  
`// -------------------`  
`const TRADE_CREATED = makeSchema({`  
 `...base,`  
 `required: [`  
 `"schema_version",`  
 `"subject_id",`  
 `"occurred_at",`  
 `"buyer_org_id",`  
 `"supplier_org_id",`  
 `"value",`  
 `"currency",`  
 `"trade_type",`  
 `],`  
 `properties: {`  
 `...base.properties,`  
 `buyer_org_id: { type: "string", format: "uuid" },`  
 `supplier_org_id: { type: "string", format: "uuid" },`  
 `trade_type: { type: "string", enum: ["low_stakes", "high_stakes"] },`  
 `value: { type: "number", minimum: 0 },`  
 `currency: { type: "string", minLength: 3, maxLength: 3 },`  
 `},`  
`});`

`const PAYMENT_CONFIRMED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "payment_ref", "amount"],`  
 `properties: {`  
 `...base.properties,`  
 `payment_ref: { type: "string", minLength: 6 },`  
 `amount: { type: "number", minimum: 0 },`  
 `},`  
`});`

`const INSPECTION_REPORT_UPLOADED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "inspection_id", "report_uri", "result"],`  
 `properties: {`  
 `...base.properties,`  
 `inspection_id: { type: "string", minLength: 6 },`  
 `report_uri: { type: "string", minLength: 10 },`  
 `result: { type: "string", enum: ["pass", "fail", "conditional"] },`  
 `notes: { type: "string" },`  
 `},`  
`});`

`const ESCROW_RELEASE_AUTHORIZED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "amount", "currency", "inspection_event_id"],`  
 `properties: {`  
 `...base.properties,`  
 `amount: { type: "number", minimum: 0 },`  
 `currency: { type: "string", minLength: 3, maxLength: 3 },`  
 `inspection_event_id: { type: "string", format: "uuid" },`  
 `},`  
`});`

`// -------------------`  
`// COMPLIANCE`  
`// -------------------`  
`const CERTIFICATION_VERIFIED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "cert_type", "issuer", "valid_to", "issuer_signature_ref"],`  
 `properties: {`  
 `...base.properties,`  
 `cert_type: { type: "string" },`  
 `issuer: { type: "string" },`  
 `valid_to: { type: "string", format: "date-time" },`  
 `issuer_signature_ref: { type: "string", minLength: 10 },`  
 `},`  
`});`

`const CERTIFICATION_SUSPENDED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "reason", "issuer_signature_ref"],`  
 `properties: {`  
 `...base.properties,`  
 `reason: { type: "string", minLength: 5 },`  
 `issuer_signature_ref: { type: "string", minLength: 10 },`  
 `},`  
`});`

`const TC_ISSUED = makeSchema({`  
 `...base,`  
 `required: [`  
 `"schema_version",`  
 `"subject_id",`  
 `"occurred_at",`  
 `"batch_id",`  
 `"material",`  
 `"quantity",`  
 `"uom",`  
 `"origin_country",`  
 `"certificate_ref",`  
 `],`  
 `properties: {`  
 `...base.properties,`  
 `batch_id: { type: "string", format: "uuid" },`  
 `material: { type: "string" },`  
 `quantity: { type: "number", minimum: 0 },`  
 `uom: { type: "string", enum: ["kg", "m", "yd", "pcs"] },`  
 `origin_country: { type: "string", minLength: 2, maxLength: 2 },`  
 `certificate_ref: { type: "string", minLength: 8 },`  
 `transformations: {`  
 `type: "array",`  
 `items: {`  
 `type: "object",`  
 `required: ["step", "from_form", "to_form"],`  
 `properties: {`  
 `step: { type: "string", enum: ["spinning", "weaving", "knitting", "dyeing", "finishing", "cutting", "sewing"] },`  
 `from_form: { type: "string" },`  
 `to_form: { type: "string" },`  
 `},`  
 `additionalProperties: false,`  
 `},`  
 `},`  
 `},`  
`});`

`// -------------------`  
`// TRACEABILITY`  
`// -------------------`  
`const BATCH_CREATED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "batch_id", "material_form", "quantity", "uom"],`  
 `properties: {`  
 `...base.properties,`  
 `batch_id: { type: "string", format: "uuid" },`  
 `material_form: { type: "string", enum: ["fiber", "yarn", "fabric", "garment"] },`  
 `quantity: { type: "number", minimum: 0 },`  
 `uom: { type: "string", enum: ["kg", "m", "yd", "pcs"] },`  
 `},`  
`});`

`const BATCH_TRANSFORMED = makeSchema({`  
 `...base,`  
 `required: [`  
 `"schema_version",`  
 `"subject_id",`  
 `"occurred_at",`  
 `"batch_id",`  
 `"from_form",`  
 `"to_form",`  
 `"process",`  
 `"input_batches",`  
 `"output_batch_id",`  
 `],`  
 `properties: {`  
 `...base.properties,`  
 `batch_id: { type: "string", format: "uuid" },`  
 `from_form: { type: "string", enum: ["fiber", "yarn", "fabric"] },`  
 `to_form: { type: "string", enum: ["yarn", "fabric", "garment"] },`  
 `process: { type: "string", enum: ["spinning", "weaving", "knitting", "dyeing", "finishing", "cutting", "sewing"] },`  
 `input_batches: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } },`  
 `output_batch_id: { type: "string", format: "uuid" },`  
 `yield_ratio: { type: "number", minimum: 0, maximum: 2 },`  
 `},`  
`});`

`const TRACE_EDGE_ADDED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "from_node_id", "to_node_id", "material_type"],`  
 `properties: {`  
 `...base.properties,`  
 `from_node_id: { type: "string", format: "uuid" },`  
 `to_node_id: { type: "string", format: "uuid" },`  
 `material_type: { type: "string" },`  
 `},`  
`});`

`// -------------------`  
`// GOVERNANCE`  
`// -------------------`  
`const CHECKER_APPROVAL = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "maker_id", "checker_id", "action"],`  
 `properties: {`  
 `...base.properties,`  
 `maker_id: { type: "string", format: "uuid" },`  
 `checker_id: { type: "string", format: "uuid" },`  
 `action: { type: "string" },`  
 `},`  
`});`

`const SANCTION_APPLIED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "org_id", "sanction_type", "severity"],`  
 `properties: {`  
 `...base.properties,`  
 `org_id: { type: "string", format: "uuid" },`  
 `sanction_type: { type: "string" },`  
 `severity: { type: "integer", minimum: 1, maximum: 10 },`  
 `},`  
`});`

`const KILL_SWITCH_ACTIVATED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "switch_type", "scope", "mode"],`  
 `properties: {`  
 `...base.properties,`  
 `switch_type: { type: "string", enum: ["transaction", "certification", "ai", "tenant", "jurisdiction", "platform"] },`  
 `scope: { type: "string" },`  
 `mode: { type: "string", enum: ["read_only", "approval_only"] },`  
 `},`  
`});`

`const DOCTRINE_OVERRIDE = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "override_reason", "maker_id", "checker_id"],`  
 `properties: {`  
 `...base.properties,`  
 `override_reason: { type: "string", minLength: 10 },`  
 `maker_id: { type: "string", format: "uuid" },`  
 `checker_id: { type: "string", format: "uuid" },`  
 `},`  
`});`

`// -------------------`  
`// AI`  
`// -------------------`  
`const AI_RISK_SCORED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "risk_score", "confidence"],`  
 `properties: {`  
 `...base.properties,`  
 `model_id: { type: "string" },`  
 `risk_score: { type: "number", minimum: 0, maximum: 100 },`  
 `confidence: { type: "number", minimum: 0, maximum: 1 },`  
 `audit_uri: { type: "string" },`  
 `},`  
`});`

`const AI_DECISION_APPLIED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "decision", "confidence"],`  
 `properties: {`  
 `...base.properties,`  
 `model_id: { type: "string" },`  
 `decision: { type: "string" },`  
 `confidence: { type: "number", minimum: 0, maximum: 1 },`  
 `audit_uri: { type: "string" }, // optional if using reasoning_hash FK; edge function will enforce one or the other`  
 `},`  
`});`

`const AI_DRIFT_DETECTED = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "signal", "severity"],`  
 `properties: {`  
 `...base.properties,`  
 `model_id: { type: "string" },`  
 `signal: { type: "string" },`  
 `severity: { type: "integer", minimum: 1, maximum: 10 },`  
 `},`  
`});`

`const AI_OVERRIDE_BY_HUMAN = makeSchema({`  
 `...base,`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "reason"],`  
 `properties: {`  
 `...base.properties,`  
 `model_id: { type: "string" },`  
 `reason: { type: "string", minLength: 5 },`  
 `},`  
`});`

`// Registry (event_type -> schema)`  
`export const eventSchemas: Record<string, object> = {`  
 `// trade`  
 `TRADE_CREATED,`  
 `PAYMENT_CONFIRMED,`  
 `INSPECTION_REPORT_UPLOADED,`  
 `ESCROW_RELEASE_AUTHORIZED,`

`// compliance`  
 `CERTIFICATION_VERIFIED,`  
 `CERTIFICATION_SUSPENDED,`  
 `TC_ISSUED,`

`// traceability`  
 `BATCH_CREATED,`  
 `BATCH_TRANSFORMED,`  
 `TRACE_EDGE_ADDED,`

`// governance`  
 `CHECKER_APPROVAL,`  
 `SANCTION_APPLIED,`  
 `KILL_SWITCH_ACTIVATED,`  
 `DOCTRINE_OVERRIDE,`

`// ai`  
 `AI_RISK_SCORED,`  
 `AI_DECISION_APPLIED,`  
 `AI_DRIFT_DETECTED,`  
 `AI_OVERRIDE_BY_HUMAN,`  
`};`

### **`src/events/validate.ts`**

`// src/events/validate.ts`  
`// Ajv validator helper for event payloads`

`import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";`  
`import addFormats from "ajv-formats";`  
`import { eventSchemas } from "./schemas";`

`export type ValidationResult =`  
 `| { ok: true }`  
 `| { ok: false; message: string; errors?: ErrorObject[] };`

`const ajv = new Ajv({`  
 `allErrors: true,`  
 `strict: true,`  
 `removeAdditional: false, // fail, don't strip`  
`});`  
`addFormats(ajv);`

`// Compile once at startup`  
`const validators: Record<string, ValidateFunction> = {};`  
`for (const [eventType, schema] of Object.entries(eventSchemas)) {`  
 `validators[eventType] = ajv.compile(schema);`  
`}`

`export function validateEventPayload(eventType: string, payload: unknown): ValidationResult {`  
 `const validate = validators[eventType];`  
 `if (!validate) {`  
 ``return { ok: false, message: `Unknown event_type: ${eventType}` };``  
 `}`  
 `const ok = validate(payload);`  
 `if (ok) return { ok: true };`  
 `return {`  
 `ok: false,`  
 ``message: `Schema validation failed for ${eventType}`,``  
 `errors: validate.errors ?? undefined,`  
 `};`  
`}`

---

## **2\) Supabase Edge Function: `emit_event()` (schema validation \+ org scoping \+ maker–checker)**

This example:

- Extracts `org_id`, `org_type`, `sub` (user id) from Supabase JWT

- Validates payload using the same schema registry

- Forces `org_id` to match JWT claim (org scoping)

- Enforces maker–checker for configured irreversible event types

- Enforces AI explainability: requires either `reasoning_hash` or `payload.audit_uri` for `AI_DECISION_APPLIED`

- Inserts event into `public.events` via service role client

- Optionally checks `reasoning_hash` exists in `reasoning_logs` (foreign key will enforce too, but we give a clearer error)

### **`supabase/functions/emit_event/index.ts`**

`/// <reference lib="deno.ns" />`

`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`  
`import Ajv from "https://esm.sh/ajv@8.12.0";`  
`import addFormats from "https://esm.sh/ajv-formats@3.0.1";`

`// --- Inline schemas for Edge (simplest copy/paste).`  
`// In production, you can bundle/compile these during build, but this works now.`

`const eventSchemas: Record<string, any> = {`  
 `TRADE_CREATED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "buyer_org_id", "supplier_org_id", "value", "currency", "trade_type"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `buyer_org_id: { type: "string", format: "uuid" },`  
 `supplier_org_id: { type: "string", format: "uuid" },`  
 `trade_type: { type: "string", enum: ["low_stakes", "high_stakes"] },`  
 `value: { type: "number", minimum: 0 },`  
 `currency: { type: "string", minLength: 3, maxLength: 3 }`  
 `},`  
 `additionalProperties: false`  
 `},`

`PAYMENT_CONFIRMED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "payment_ref", "amount"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `payment_ref: { type: "string", minLength: 6 },`  
 `amount: { type: "number", minimum: 0 }`  
 `},`  
 `additionalProperties: false`  
 `},`

`INSPECTION_REPORT_UPLOADED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "inspection_id", "report_uri", "result"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `inspection_id: { type: "string", minLength: 6 },`  
 `report_uri: { type: "string", minLength: 10 },`  
 `result: { type: "string", enum: ["pass", "fail", "conditional"] },`  
 `notes: { type: "string" }`  
 `},`  
 `additionalProperties: false`  
 `},`

`ESCROW_RELEASE_AUTHORIZED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "amount", "currency", "inspection_event_id"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `amount: { type: "number", minimum: 0 },`  
 `currency: { type: "string", minLength: 3, maxLength: 3 },`  
 `inspection_event_id: { type: "string", format: "uuid" }`  
 `},`  
 `additionalProperties: false`  
 `},`

`CERTIFICATION_VERIFIED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "cert_type", "issuer", "valid_to", "issuer_signature_ref"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `cert_type: { type: "string" },`  
 `issuer: { type: "string" },`  
 `valid_to: { type: "string", format: "date-time" },`  
 `issuer_signature_ref: { type: "string", minLength: 10 }`  
 `},`  
 `additionalProperties: false`  
 `},`

`TC_ISSUED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "batch_id", "material", "quantity", "uom", "origin_country", "certificate_ref"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `batch_id: { type: "string", format: "uuid" },`  
 `material: { type: "string" },`  
 `quantity: { type: "number", minimum: 0 },`  
 `uom: { type: "string", enum: ["kg", "m", "yd", "pcs"] },`  
 `origin_country: { type: "string", minLength: 2, maxLength: 2 },`  
 `certificate_ref: { type: "string", minLength: 8 }`  
 `},`  
 `additionalProperties: false`  
 `},`

`CHECKER_APPROVAL: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "maker_id", "checker_id", "action"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `maker_id: { type: "string", format: "uuid" },`  
 `checker_id: { type: "string", format: "uuid" },`  
 `action: { type: "string" }`  
 `},`  
 `additionalProperties: false`  
 `},`

`AI_DECISION_APPLIED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "decision", "confidence"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `model_id: { type: "string" },`  
 `decision: { type: "string" },`  
 `confidence: { type: "number", minimum: 0, maximum: 1 },`  
 `audit_uri: { type: "string" }`  
 `},`  
 `additionalProperties: false`  
 `},`

`AI_RISK_SCORED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "risk_score", "confidence"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `model_id: { type: "string" },`  
 `risk_score: { type: "number", minimum: 0, maximum: 100 },`  
 `confidence: { type: "number", minimum: 0, maximum: 1 },`  
 `audit_uri: { type: "string" }`  
 `},`  
 `additionalProperties: false`  
 `},`

`AI_DRIFT_DETECTED: {`  
 `type: "object",`  
 `required: ["schema_version", "subject_id", "occurred_at", "model_id", "signal", "severity"],`  
 `properties: {`  
 `schema_version: { const: "1.0" },`  
 `subject_id: { type: "string", format: "uuid" },`  
 `occurred_at: { type: "string", format: "date-time" },`  
 `model_id: { type: "string" },`  
 `signal: { type: "string" },`  
 `severity: { type: "integer", minimum: 1, maximum: 10 }`  
 `},`  
 `additionalProperties: false`  
 `}`  
`};`

`const ajv = new Ajv({ allErrors: true, strict: true });`  
`addFormats(ajv);`  
`const validators = new Map<string, any>();`  
`for (const [eventType, schema] of Object.entries(eventSchemas)) {`  
 `validators.set(eventType, ajv.compile(schema));`  
`}`

`// Irreversible event types requiring Maker–Checker`  
`const IRREVERSIBLE_EVENT_TYPES = new Set<string>([`  
 `"ESCROW_RELEASE_AUTHORIZED",`  
 `"DOCTRINE_OVERRIDE",`  
 `"KILL_SWITCH_ACTIVATED",`  
 `"TENANT_PERMANENTLY_OFFBOARDED" // if you add it later`  
`]);`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

`function getJwtClaims(user: any) {`  
 `// Supabase user object includes app_metadata/user_metadata; org_id is typically in JWT claims.`  
 `// In Edge Functions, easiest is to read from the verified JWT payload via getUser().`  
 `// We'll fetch org_id/org_type from user.user_metadata or app_metadata if you map it there,`  
 `// BUT recommended is custom JWT claims. We'll accept either:`  
 `const meta = { ...(user?.user_metadata ?? {}), ...(user?.app_metadata ?? {}) };`  
 `return {`  
 `sub: user?.id as string | undefined,`  
 `org_id: meta.org_id as string | undefined,`  
 `org_type: meta.org_type as string | undefined,`  
 `};`  
`}`

`Deno.serve(async (req) => {`  
 `try {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

    `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
    `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`

    `// Client with user auth for identity verification`
    `const userClient = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },`
    `});`

    `const { data: userData, error: userErr } = await userClient.auth.getUser();`
    `if (userErr || !userData?.user) {`
      `return jsonResponse({ error: "Unauthorized" }, 401);`
    `}`

    `const claims = getJwtClaims(userData.user);`
    `if (!claims.sub) return jsonResponse({ error: "Invalid user" }, 401);`
    `if (!claims.org_id) return jsonResponse({ error: "Missing org_id claim" }, 403);`

    `const body = await req.json().catch(() => null);`
    `if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);`

    `const {`
      `event_domain,`
      `event_type,`
      `org_id,`
      `payload,`
      `schema_version,`
      `reasoning_hash`
    `} = body as {`
      `event_domain: string;`
      `event_type: string;`
      `org_id: string;`
      `payload: unknown;`
      `schema_version: string;`
      `reasoning_hash?: string | null;`
    `};`

    `// --- Org scoping enforcement ---`
    `if (org_id !== claims.org_id) {`
      `return jsonResponse({ error: "org_id mismatch (tenant scoping violation)" }, 403);`
    `}`

    `// --- Schema enforcement ---`
    `const validate = validators.get(event_type);`
    `if (!validate) {`
      ``return jsonResponse({ error: `Unknown event_type: ${event_type}` }, 400);``
    `}`
    `const ok = validate(payload);`
    `if (!ok) {`
      `return jsonResponse(`
        `{ error: "Schema validation failed", event_type, details: validate.errors },`
        `422`
      `);`
    `}`

    `// --- Schema version enforcement ---`
    `if (schema_version !== "1.0") {`
      `return jsonResponse({ error: "Unsupported schema_version", schema_version }, 400);`
    `}`

    `// --- AI explainability enforcement ---`
    `if (event_type === "AI_DECISION_APPLIED") {`
      `const p = payload as any;`
      `const hasAuditUri = !!p?.audit_uri;`
      `const hasReasoningHash = !!reasoning_hash;`
      `if (!hasAuditUri && !hasReasoningHash) {`
        `return jsonResponse(`
          `{ error: "AI_DECISION_APPLIED requires reasoning_hash or payload.audit_uri" },`
          `422`
        `);`
      `}`
    `}`

    `// --- Maker–Checker enforcement for irreversible events ---`
    `if (IRREVERSIBLE_EVENT_TYPES.has(event_type)) {`
      `// Require payload to include maker/checker and enforce separation.`
      `const p = payload as any;`
      `const makerId = p?.maker_id ?? claims.sub; // maker defaults to caller`
      `const checkerId = p?.checker_id;`

      `if (!checkerId) {`
        `return jsonResponse({ error: "Irreversible event requires checker_id" }, 422);`
      `}`
      `if (makerId === checkerId) {`
        `return jsonResponse({ error: "Maker–Checker violation: maker_id must differ from checker_id" }, 422);`
      `}`

      `// Optional: enforce that checker is a privileged role in same org (recommended).`
      `// Here we check org_roles for role = 'RISK_COMPLIANCE_AUTHORITY' or 'DOCTRINE_COUNCIL' etc.`
      `const svc = createClient(supabaseUrl, serviceKey);`
      `const { data: checkerRoleRows, error: roleErr } = await svc`
        `.from("org_roles")`
        `.select("role")`
        `.eq("org_id", org_id)`
        `.eq("user_id", checkerId);`

      `if (roleErr) return jsonResponse({ error: "Role lookup failed", details: roleErr.message }, 500);`

      `const allowedCheckerRoles = new Set(["RISK_COMPLIANCE_AUTHORITY", "DOCTRINE_COUNCIL", "SYSTEM_INTEGRITY"]);`
      `const okChecker = (checkerRoleRows ?? []).some((r) => allowedCheckerRoles.has(r.role));`
      `if (!okChecker) {`
        `return jsonResponse({ error: "Checker not authorized for irreversible approval" }, 403);`
      `}`

      `// Normalize maker_id into payload if missing`
      `if (!p.maker_id) p.maker_id = makerId;`
      `(payload as any) = p;`
    `}`

    `// --- reasoning_hash existence check (friendly error) ---`
    `if (reasoning_hash) {`
      `const svc = createClient(supabaseUrl, serviceKey);`
      `const { data: rl, error: rlErr } = await svc`
        `.from("reasoning_logs")`
        `.select("id")`
        `.eq("id", reasoning_hash)`
        `.maybeSingle();`

      `if (rlErr) return jsonResponse({ error: "reasoning_logs lookup failed", details: rlErr.message }, 500);`
      `if (!rl) return jsonResponse({ error: "reasoning_hash not found in reasoning_logs" }, 422);`
    `}`

    `// --- Insert event using service role (so insert is guaranteed and consistent) ---`
    `const svc = createClient(supabaseUrl, serviceKey);`

    `const insertRow = {`
      `event_domain,`
      `event_type,`
      `org_id,`
      `actor_id: claims.sub,`
      `payload,`
      `schema_version,`
      `reasoning_hash: reasoning_hash ?? null,`
    `};`

    `const { data: inserted, error: insErr } = await svc`
      `.from("events")`
      `.insert(insertRow)`
      `.select("id, created_at")`
      `.single();`

    `if (insErr) return jsonResponse({ error: "Insert failed", details: insErr.message }, 500);`

    `return jsonResponse({ ok: true, event_id: inserted.id, created_at: inserted.created_at }, 201);`

`} catch (e) {`  
 `return jsonResponse({ error: "Unhandled error", details: String(e) }, 500);`  
 `}`  
`});`

---

## **Minimal request contract for `emit_event`**

Call:

- `POST /functions/v1/emit_event`

- Header: `Authorization: Bearer <user_jwt>`

- Body:

`{`  
 `"event_domain": "trade",`  
 `"event_type": "PAYMENT_CONFIRMED",`  
 `"org_id": "<must match jwt org_id>",`  
 `"schema_version": "1.0",`  
 `"reasoning_hash": null,`  
 `"payload": {`  
 `"schema_version": "1.0",`  
 `"subject_id": "<trade_uuid>",`  
 `"occurred_at": "2026-02-07T12:00:00Z",`  
 `"payment_ref": "PAY_123456",`  
 `"amount": 1200`  
 `}`  
`}`

---

## **What to ticket next (fastest path to production discipline)**

1. **Edge Function deployment \+ smoke test** (valid/invalid payloads)

2. **Client SDK wrapper**: `emitEvent(eventType, payload, {reasoningHash?})`

3. **Add remaining schemas** (the ones omitted for brevity in Edge inline registry) OR switch Edge function to import/build step bundling so you can reuse the full `eventSchemas`.

If you want, I can also generate a **single shared “schema pack”** that both:

- Next.js app (TS) and

- Supabase Edge (Deno)  
   can import without duplication (via build-time bundling).

# **Ticket 1 — Edge Function Deployment \+ Smoke Tests (valid/invalid payloads)**

## **Goal**

Deploy `emit_event` to Supabase and prove:

- ✅ valid events insert successfully

- ❌ invalid payloads are rejected (422)

- ❌ org scoping violations are rejected (403)

- ❌ irreversible events without checker are rejected (422/403)

- ❌ AI decision without explainability is rejected (422)

## **Deliverables**

- `supabase/functions/emit_event/index.ts` (already provided)

- `supabase/functions/emit_event/smoke_test.ts` (new)

- CI step or manual script to run tests

- A “Test Matrix” checklist in the ticket

## **Steps**

### **1\. Deploy function**

`supabase functions deploy emit_event --project-ref <PROJECT_REF>`

### **2\. Set secrets**

`supabase secrets set \`  
 `SUPABASE_URL="https://<project>.supabase.co" \`  
 `SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"`

### **3\. Smoke test script (copy/paste)**

Create: `supabase/functions/emit_event/smoke_test.ts`

`/**`  
 `* Smoke tests for emit_event`  
 `* Run locally:`  
 `*   deno run -A supabase/functions/emit_event/smoke_test.ts`  
 `*`  
 `* Requires:`  
 `*   EMIT_EVENT_URL`  
 `*   USER_JWT (belongs to org A)`  
 `*   OTHER_ORG_ID (org B, not equal to jwt org_id)`  
 `*/`

`const url = Deno.env.get("EMIT_EVENT_URL");`  
`const jwt = Deno.env.get("USER_JWT");`  
`const otherOrgId = Deno.env.get("OTHER_ORG_ID");`

`if (!url || !jwt || !otherOrgId) {`  
 `console.error("Missing env: EMIT_EVENT_URL, USER_JWT, OTHER_ORG_ID");`  
 `Deno.exit(1);`  
`}`

`async function post(body: unknown) {`  
 `const res = await fetch(url, {`  
 `method: "POST",`  
 `headers: {`  
 ``Authorization: `Bearer ${jwt}`,``  
 `"Content-Type": "application/json",`  
 `},`  
 `body: JSON.stringify(body),`  
 `});`  
 `const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch {}`  
 `return { status: res.status, json, text };`  
`}`

`const now = new Date().toISOString();`  
`const tradeId = crypto.randomUUID();`

`console.log("\n[1] VALID: PAYMENT_CONFIRMED");`  
`{`  
 `const r = await post({`  
 `event_domain: "trade",`  
 `event_type: "PAYMENT_CONFIRMED",`  
 `org_id: "__JWT_ORG__", // intentionally placeholder, expect function to reject if not matching`  
 `schema_version: "1.0",`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: tradeId,`  
 `occurred_at: now,`  
 `payment_ref: "PAY_123456",`  
 `amount: 1200`  
 `}`  
 `});`  
 `console.log(r.status, r.json ?? r.text);`  
 `console.log("NOTE: Replace org_id with your JWT org_id for this test to pass.");`  
`}`

`console.log("\n[2] INVALID: Schema failure (missing amount)");`  
`{`  
 `const r = await post({`  
 `event_domain: "trade",`  
 `event_type: "PAYMENT_CONFIRMED",`  
 `org_id: "__JWT_ORG__",`  
 `schema_version: "1.0",`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: tradeId,`  
 `occurred_at: now,`  
 `payment_ref: "PAY_123456"`  
 `}`  
 `});`  
 `console.log(r.status, r.json ?? r.text); // expect 422`  
`}`

`console.log("\n[3] INVALID: org scoping violation");`  
`{`  
 `const r = await post({`  
 `event_domain: "trade",`  
 `event_type: "PAYMENT_CONFIRMED",`  
 `org_id: otherOrgId, // wrong org`  
 `schema_version: "1.0",`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: tradeId,`  
 `occurred_at: now,`  
 `payment_ref: "PAY_123456",`  
 `amount: 1200`  
 `}`  
 `});`  
 `console.log(r.status, r.json ?? r.text); // expect 403`  
`}`

`console.log("\n[4] INVALID: irreversible without checker_id (ESCROW_RELEASE_AUTHORIZED)");`  
`{`  
 `const r = await post({`  
 `event_domain: "trade",`  
 `event_type: "ESCROW_RELEASE_AUTHORIZED",`  
 `org_id: "__JWT_ORG__",`  
 `schema_version: "1.0",`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: tradeId,`  
 `occurred_at: now,`  
 `amount: 1200,`  
 `currency: "USD",`  
 `inspection_event_id: crypto.randomUUID()`  
 `// missing checker_id => expect 422`  
 `}`  
 `});`  
 `console.log(r.status, r.json ?? r.text);`  
`}`

`console.log("\n[5] INVALID: AI_DECISION_APPLIED without reasoning_hash or audit_uri");`  
`{`  
 `const r = await post({`  
 `event_domain: "ai",`  
 `event_type: "AI_DECISION_APPLIED",`  
 `org_id: "__JWT_ORG__",`  
 `schema_version: "1.0",`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: tradeId,`  
 `occurred_at: now,`  
 `model_id: "risk-v1",`  
 `decision: "hold",`  
 `confidence: 0.92`  
 `// missing audit_uri`  
 `}`  
 `});`  
 `console.log(r.status, r.json ?? r.text); // expect 422`  
`}`

### **4\. Test Matrix checklist**

- Valid event inserts → returns `{ok:true,event_id}`

- Invalid schema returns 422 with Ajv errors

- org mismatch returns 403

- irreversible event missing checker returns 422

- maker==checker returns 422

- AI_DECISION_APPLIED missing explainability returns 422

---

# **Ticket 2 — Client SDK Wrapper: `emitEvent(eventType, payload, { reasoningHash? })`**

## **Goal**

All app code emits events through one typed wrapper:

- validates schema locally (fast feedback)

- calls Edge `emit_event`

- normalizes request structure

## **Deliverables**

- `src/events/client.ts`

- `src/events/types.ts` (type safety for event types/payloads)

- integration usage example

### **`src/events/types.ts`**

`export type EventType =`  
 `| "TRADE_CREATED"`  
 `| "PAYMENT_CONFIRMED"`  
 `| "INSPECTION_REPORT_UPLOADED"`  
 `| "ESCROW_RELEASE_AUTHORIZED"`  
 `| "CERTIFICATION_VERIFIED"`  
 `| "CERTIFICATION_SUSPENDED"`  
 `| "TC_ISSUED"`  
 `| "BATCH_CREATED"`  
 `| "BATCH_TRANSFORMED"`  
 `| "TRACE_EDGE_ADDED"`  
 `| "CHECKER_APPROVAL"`  
 `| "SANCTION_APPLIED"`  
 `| "KILL_SWITCH_ACTIVATED"`  
 `| "DOCTRINE_OVERRIDE"`  
 `| "AI_RISK_SCORED"`  
 `| "AI_DECISION_APPLIED"`  
 `| "AI_DRIFT_DETECTED"`  
 `| "AI_OVERRIDE_BY_HUMAN";`

`export type EventDomain = "governance" | "compliance" | "trade" | "ai" | "traceability";`

`export interface EmitEventOptions {`  
 `reasoningHash?: string | null;`  
`}`

`export interface EmitEventRequest {`  
 `event_domain: EventDomain;`  
 `event_type: EventType;`  
 `org_id: string;           // MUST match jwt org_id`  
 `schema_version: "1.0";`  
 `reasoning_hash?: string | null;`  
 `payload: unknown;`  
`}`

### **`src/events/client.ts`**

`import { validateEventPayload } from "./validate";`  
`import type { EventDomain, EventType, EmitEventOptions } from "./types";`

`export class EmitEventError extends Error {`  
 `constructor(`  
 `message: string,`  
 `public status?: number,`  
 `public details?: unknown`  
 `) {`  
 `super(message);`  
 `}`  
`}`

`export async function emitEvent(params: {`  
 `eventDomain: EventDomain;`  
 `eventType: EventType;`  
 `orgId: string;`  
 `payload: unknown;`  
 `accessToken: string; // Supabase user jwt`  
 `options?: EmitEventOptions;`  
`}) {`  
 `const { eventDomain, eventType, orgId, payload, accessToken, options } = params;`

`// 1) Local schema validation (fast fail)`  
 `const v = validateEventPayload(eventType, payload);`  
 `if (!v.ok) {`  
 `throw new EmitEventError(v.message, 422, v.errors);`  
 `}`

`// 2) Call Edge Function`  
 `const res = await fetch("/api/emit-event", {`  
 `method: "POST",`  
 `headers: {`  
 `"Content-Type": "application/json",`  
 ``Authorization: `Bearer ${accessToken}`,``  
 `},`  
 `body: JSON.stringify({`  
 `event_domain: eventDomain,`  
 `event_type: eventType,`  
 `org_id: orgId,`  
 `schema_version: "1.0",`  
 `reasoning_hash: options?.reasoningHash ?? null,`  
 `payload,`  
 `}),`  
 `});`

`const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch {}`

`if (!res.ok) {`  
 `throw new EmitEventError(`  
 `json?.error ?? "emitEvent failed",`  
 `res.status,`  
 `json ?? text`  
 `);`  
 `}`

`return json as { ok: true; event_id: string; created_at: string };`  
`}`

### **Next.js API route proxy (so browser doesn’t need Supabase URL)**

Create `app/api/emit-event/route.ts`:

`import { NextResponse } from "next/server";`

`export async function POST(req: Request) {`  
 `const auth = req.headers.get("authorization") ?? "";`  
 `const body = await req.text();`

`const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;`  
 ``const functionUrl = `${supabaseUrl}/functions/v1/emit_event`;``

`const res = await fetch(functionUrl, {`  
 `method: "POST",`  
 `headers: {`  
 `"content-type": "application/json",`  
 `authorization: auth,`  
 `},`  
 `body,`  
 `});`

`const text = await res.text();`  
 `return new NextResponse(text, {`  
 `status: res.status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

---

# **Ticket 3 — Single Shared “Schema Pack” for Next.js (TS) \+ Edge (Deno) (no duplication)**

## **Goal**

Maintain **one source of truth** for schemas:

- Next.js imports them for compile-time local validation

- Edge imports them for runtime enforcement

- No schema duplication in Edge function

## **Approach (works well with pnpm monorepo)**

Create a package: `packages/event-schemas`

### **Folder structure**

`packages/event-schemas/`  
 `src/`  
 `schemas.ts          (exports eventSchemas)`  
 `index.ts            (exports eventSchemas + helper types)`  
 `package.json`  
 `tsconfig.json`

Then you **bundle** it for Edge using `esbuild` into a single ESM file.

---

## **Schema Pack: `packages/event-schemas/src/schemas.ts`**

Use the schema registry you already have (from my earlier TS registry), export it:

`export const eventSchemas: Record<string, object> = {`  
 `// (paste the full registry from src/events/schemas.ts)`  
`};`

## **Schema Pack: `packages/event-schemas/src/index.ts`**

`export { eventSchemas } from "./schemas";`

## **`packages/event-schemas/package.json`**

`{`  
 `"name": "@texqtic/event-schemas",`  
 `"version": "0.1.0",`  
 `"type": "module",`  
 `"main": "./dist/index.js",`  
 `"exports": {`  
 `".": "./dist/index.js"`  
 `},`  
 `"scripts": {`  
 `"build": "tsc -p tsconfig.json",`  
 `"bundle:edge": "node ../../scripts/bundle-edge-schemas.mjs"`  
 `}`  
`}`

## **`packages/event-schemas/tsconfig.json`**

`{`  
 `"compilerOptions": {`  
 `"target": "ES2022",`  
 `"module": "ESNext",`  
 `"declaration": false,`  
 `"outDir": "dist",`  
 `"moduleResolution": "Bundler",`  
 `"strict": true,`  
 `"skipLibCheck": true`  
 `},`  
 `"include": ["src/**/*.ts"]`  
`}`

---

## **Bundling for Edge (single ESM file)**

Create: `scripts/bundle-edge-schemas.mjs`

`import esbuild from "esbuild";`  
`import path from "path";`

`const entry = path.resolve("packages/event-schemas/src/index.ts");`  
`const out = path.resolve("supabase/functions/_shared/event-schemas.bundle.js");`

`await esbuild.build({`  
 `entryPoints: [entry],`  
 `outfile: out,`  
 `bundle: true,`  
 `platform: "neutral",`  
 `format: "esm",`  
 `target: ["es2022"],`  
 `treeShaking: true`  
`});`

`console.log("Bundled schema pack ->", out);`

Now Edge can import a **local file**:

### **`supabase/functions/_shared/eventSchemas.ts`**

`// This file is generated by scripts/bundle-edge-schemas.mjs`  
`export * from "./event-schemas.bundle.js";`

---

## **Update Edge Function to import schemas (no duplication)**

In `supabase/functions/emit_event/index.ts` replace inline `eventSchemas` with:

`import { eventSchemas } from "../_shared/eventSchemas.ts";`

Then compile Ajv validators from that registry. Done.

---

# **How to keep it disciplined (so humans don’t lose focus)**

**Single rule:** No one adds a new event_type unless they add:

1. schema in `@texqtic/event-schemas`

2. local validator test

3. edge smoke test case

This keeps you moving forward without chaos.

---

# **✅ Next logical task (only one)**

**Next: “End-to-end contract test: DB \+ Edge \+ Client wrapper”**  
 One test that:

- creates reasoning_log

- emits `TRADE_CREATED` → `PAYMENT_CONFIRMED` → `INSPECTION_REPORT_UPLOADED` → `CHECKER_APPROVAL` → `ESCROW_RELEASE_AUTHORIZED`

- then attempts a forbidden transition and proves it fails

# **Ticket — End-to-End Contract Test: DB \+ Edge \+ Client Wrapper (Happy Path \+ Forbidden Path)**

## **Goal**

Prove the **TexQtic v1.4 “Database Fortress”** is real by running one automated test that spans:

- **Schema pack** (shared eventSchemas)

- **Client wrapper** (`emitEvent`)

- **Supabase Edge Function** (`emit_event`)

- **Database constraints \+ triggers**
  - append-only events

  - org scoping

  - AI explainability enforcement (where applicable)

  - maker–checker gate for irreversible events

  - trade state machine trigger (`trg_enforce_trade_transition`)

✅ The test must demonstrate both:

1. **Happy Path:** a valid trade lifecycle emits prerequisite events and allows state transitions

2. **Forbidden Path:** attempting a state transition without prerequisite events (or without maker–checker) fails **reliably** and **predictably**

---

## **Scope (Baseline Domain)**

Trade \+ Compliance only, with minimal required governance:

**Events used**

- `TRADE_CREATED`

- `PAYMENT_CONFIRMED`

- `INSPECTION_REPORT_UPLOADED`

- `CHECKER_APPROVAL`

- `ESCROW_RELEASE_AUTHORIZED`

**DB transition tested**

- `trades.state`:
  - `contract_signed → escrow_funded` requires `PAYMENT_CONFIRMED`

  - `shipped → inspected` requires `INSPECTION_REPORT_UPLOADED`

  - `inspected → settled` requires `ESCROW_RELEASE_AUTHORIZED` \+ `CHECKER_APPROVAL` (maker \!= checker)

---

## **Preconditions**

1. v1.4 SQL migration applied (enums, events table, trade_transitions, trigger enforcement).

2. Edge function `emit_event` deployed.

3. Shared schema pack is bundled for Edge and used by Next \+ Edge.

4. Two test users exist in the same org:
   - **Maker**: normal tenant user

   - **Checker**: user with `org_roles.role` ∈ {`RISK_COMPLIANCE_AUTHORITY`, `DOCTRINE_COUNCIL`, `SYSTEM_INTEGRITY`}

5. JWT custom claims exist (or mapped into user metadata for now):
   - maker has `org_id`, `org_type`

   - checker has `org_id`, `org_type`

---

## **Deliverables**

- `tests/e2e/contract_trade_lifecycle.test.ts` (Node/TS)

- Test runner wiring (Vitest or Jest)

- `.env.test` template

---

## **Environment Variables (Test)**

Create `.env.test`:

- `NEXT_PUBLIC_SUPABASE_URL=...`

- `SUPABASE_SERVICE_ROLE_KEY=...` _(for test setup only — never in client)_

- `EMIT_EVENT_URL=https://<project>.supabase.co/functions/v1/emit_event`

- `MAKER_JWT=...`

- `CHECKER_JWT=...`

- `ORG_ID=...`

- `MAKER_USER_ID=...`

- `CHECKER_USER_ID=...`

---

## **Test Implementation (Copy/Paste)**

### **`tests/e2e/contract_trade_lifecycle.test.ts`**

`import { describe, it, expect, beforeAll } from "vitest";`  
`import { createClient } from "@supabase/supabase-js";`

`type EmitResp = { ok: true; event_id: string; created_at: string };`

`const EMIT_EVENT_URL = process.env.EMIT_EVENT_URL!;`  
`const MAKER_JWT = process.env.MAKER_JWT!;`  
`const CHECKER_JWT = process.env.CHECKER_JWT!;`  
`const ORG_ID = process.env.ORG_ID!;`  
`const MAKER_USER_ID = process.env.MAKER_USER_ID!;`  
`const CHECKER_USER_ID = process.env.CHECKER_USER_ID!;`  
`const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;`  
`const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;`

`if (`  
 `!EMIT_EVENT_URL || !MAKER_JWT || !CHECKER_JWT || !ORG_ID ||`  
 `!MAKER_USER_ID || !CHECKER_USER_ID || !SUPABASE_URL || !SERVICE_ROLE_KEY`  
`) {`  
 `throw new Error("Missing required env vars for E2E test");`  
`}`

`async function emitEvent(jwt: string, body: any): Promise<{ status: number; json: any }> {`  
 `const res = await fetch(EMIT_EVENT_URL, {`  
 `method: "POST",`  
 `headers: {`  
 ``Authorization: `Bearer ${jwt}`,``  
 `"Content-Type": "application/json",`  
 `},`  
 `body: JSON.stringify(body),`  
 `});`

`const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch { json = { raw: text }; }`  
 `return { status: res.status, json };`  
`}`

`describe("E2E Contract Test: Trade lifecycle (Happy + Forbidden)", () => {`  
 `const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);`

`let tradeId: string;`

`beforeAll(async () => {`  
 `// Ensure checker has privileged role in org_roles (required by Edge maker-checker enforcement)`  
 `const { error } = await svc`  
 `.from("org_roles")`  
 `.upsert({`  
 `user_id: CHECKER_USER_ID,`  
 `org_id: ORG_ID,`  
 `role: "RISK_COMPLIANCE_AUTHORITY"`  
 `}, { onConflict: "user_id,org_id,role" });`

    `if (error) throw new Error("Failed to ensure checker role: " + error.message);`

    `// Create a trade row directly with service role (setup)`
    `tradeId = crypto.randomUUID();`
    `const { error: insErr } = await svc.from("trades").insert({`
      `id: tradeId,`
      `buyer_org_id: ORG_ID,`
      `supplier_org_id: ORG_ID,   // for baseline single-org test; multi-org can be added later`
      `value: 1200,`
      `currency: "USD",`
      `state: "contract_signed",`
      `version_id: 1`
    `});`

    `if (insErr) throw new Error("Failed to insert trade: " + insErr.message);`

`});`

`it("Happy path: emits events then allows guarded state transitions", async () => {`  
 `const now = new Date().toISOString();`

    `// 1) Emit PAYMENT_CONFIRMED (prereq for contract_signed -> escrow_funded)`
    `{`
      `const r = await emitEvent(MAKER_JWT, {`
        `event_domain: "trade",`
        `event_type: "PAYMENT_CONFIRMED",`
        `org_id: ORG_ID,`
        `schema_version: "1.0",`
        `payload: {`
          `schema_version: "1.0",`
          `subject_id: tradeId,`
          `occurred_at: now,`
          `payment_ref: "PAY_123456",`
          `amount: 1200`
        `}`
      `});`
      `expect(r.status).toBe(201);`
      `expect((r.json as EmitResp).ok).toBe(true);`
    `}`

    `// 2) Transition: contract_signed -> escrow_funded (requires PAYMENT_CONFIRMED)`
    `{`
      `const { error } = await svc`
        `.from("trades")`
        `.update({ state: "escrow_funded", version_id: 2 })`
        `.eq("id", tradeId);`

      `expect(error).toBeNull();`
    `}`

    `// 3) Move trade to shipped (setup state for inspected transition)`
    `{`
      `const { error } = await svc`
        `.from("trades")`
        `.update({ state: "shipped", version_id: 3 })`
        `.eq("id", tradeId);`

      `expect(error).toBeNull();`
    `}`

    `// 4) Emit INSPECTION_REPORT_UPLOADED (prereq for shipped -> inspected)`
    `{`
      `const r = await emitEvent(MAKER_JWT, {`
        `event_domain: "compliance",`
        `event_type: "INSPECTION_REPORT_UPLOADED",`
        `org_id: ORG_ID,`
        `schema_version: "1.0",`
        `payload: {`
          `schema_version: "1.0",`
          `subject_id: tradeId,`
          `occurred_at: now,`
          `inspection_id: "INSP_0001",`
          `report_uri: "https://example.com/reports/insp_0001.pdf",`
          `result: "pass"`
        `}`
      `});`
      `expect(r.status).toBe(201);`
      `expect((r.json as EmitResp).ok).toBe(true);`
    `}`

    `// 5) Transition: shipped -> inspected (requires INSPECTION_REPORT_UPLOADED)`
    `{`
      `const { error } = await svc`
        `.from("trades")`
        `.update({ state: "inspected", version_id: 4 })`
        `.eq("id", tradeId);`

      `expect(error).toBeNull();`
    `}`

    `// 6) Emit CHECKER_APPROVAL (governance maker-checker token)`
    `// Maker is the caller (maker_id), checker is privileged user`
    `{`
      `const r = await emitEvent(CHECKER_JWT, {`
        `event_domain: "governance",`
        `event_type: "CHECKER_APPROVAL",`
        `org_id: ORG_ID,`
        `schema_version: "1.0",`
        `payload: {`
          `schema_version: "1.0",`
          `subject_id: tradeId,`
          `occurred_at: now,`
          `maker_id: MAKER_USER_ID,`
          `checker_id: CHECKER_USER_ID,`
          `action: "ESCROW_RELEASE_AUTHORIZED"`
        `}`
      `});`
      `expect(r.status).toBe(201);`
      `expect((r.json as EmitResp).ok).toBe(true);`
    `}`

    `// 7) Emit ESCROW_RELEASE_AUTHORIZED (irreversible, must include checker_id, maker!=checker)`
    `{`
      `const r = await emitEvent(MAKER_JWT, {`
        `event_domain: "trade",`
        `event_type: "ESCROW_RELEASE_AUTHORIZED",`
        `org_id: ORG_ID,`
        `schema_version: "1.0",`
        `payload: {`
          `schema_version: "1.0",`
          `subject_id: tradeId,`
          `occurred_at: now,`
          `amount: 1200,`
          `currency: "USD",`
          `inspection_event_id: crypto.randomUUID(),`
          `maker_id: MAKER_USER_ID,`
          `checker_id: CHECKER_USER_ID`
        `}`
      `});`
      `expect(r.status).toBe(201);`
      `expect((r.json as EmitResp).ok).toBe(true);`
    `}`

    `// 8) Transition: inspected -> settled (requires ESCROW_RELEASE_AUTHORIZED + CHECKER_APPROVAL)`
    `{`
      `const { error } = await svc`
        `.from("trades")`
        `.update({ state: "settled", version_id: 5 })`
        `.eq("id", tradeId);`

      `expect(error).toBeNull();`
    `}`

`});`

`it("Forbidden path: fails transition when prerequisite event is missing", async () => {`  
 `// New trade without prereq events`  
 `const badTradeId = crypto.randomUUID();`

    `const { error: insErr } = await svc.from("trades").insert({`
      `id: badTradeId,`
      `buyer_org_id: ORG_ID,`
      `supplier_org_id: ORG_ID,`
      `value: 500,`
      `currency: "USD",`
      `state: "contract_signed",`
      `version_id: 1`
    `});`
    `expect(insErr).toBeNull();`

    `// Attempt contract_signed -> escrow_funded WITHOUT PAYMENT_CONFIRMED`
    `const { error } = await svc`
      `.from("trades")`
      `.update({ state: "escrow_funded", version_id: 2 })`
      `.eq("id", badTradeId);`

    `// Must fail due to DB trigger exception`
    `expect(error).not.toBeNull();`
    `expect(error?.message).toMatch(/Prerequisite event missing|Prerequisite Event Missing|missing/i);`

`});`

`it("Forbidden path: irreversible event rejected when maker==checker", async () => {`  
 `const now = new Date().toISOString();`

    `const r = await emitEvent(MAKER_JWT, {`
      `event_domain: "trade",`
      `event_type: "ESCROW_RELEASE_AUTHORIZED",`
      `org_id: ORG_ID,`
      `schema_version: "1.0",`
      `payload: {`
        `schema_version: "1.0",`
        `subject_id: tradeId,`
        `occurred_at: now,`
        `amount: 100,`
        `currency: "USD",`
        `inspection_event_id: crypto.randomUUID(),`
        `maker_id: MAKER_USER_ID,`
        `checker_id: MAKER_USER_ID`
      `}`
    `});`

    `expect(r.status).toBe(422);`
    `expect(String(r.json?.error ?? "")).toMatch(/Maker–Checker|maker_id must differ|violation/i);`

`});`  
`});`

---

## **Acceptance Criteria**

- Happy path inserts events and DB allows all transitions

- Forbidden transition (missing prerequisite event) fails **at DB** (trigger)

- Maker–Checker violation fails **at Edge** (422)

- Test runs repeatably in CI (no flaky timing)

---

## **Notes / Implementation Discipline**

- This test intentionally uses **service role** to update `trades.state` so it exercises the DB trigger with no policy interference.

- In production, you may restrict state transitions to RPCs; keep this test as the “fortress proof” and adjust only the update path.

---

# **Next logical task (only one)**

**Next: add the “event emission → state transition RPC” path** so that production updates never do raw `UPDATE trades SET state=...`, and your app becomes strictly event-driven.

# **Ticket — RPC State Transitions (Event-Driven Only)**

## **Goal**

Eliminate raw `UPDATE trades SET state=...` from production paths. All state transitions must occur through a **single DB RPC** that:

1. Validates **transition rule exists** (`trade_transitions`)

2. Validates **prerequisite events exist** in `events` (subject_id \= trade_id)

3. Enforces **optimistic locking** (`version_id` increments by 1\)

4. Enforces **maker–checker** for irreversible transitions

5. Writes a **TRADE_STATE_TRANSITION** event (append-only) and updates `trades.state` **atomically** (single transaction)

6. Obeys **org scoping** (caller must be buyer or supplier org)

This makes the platform **physically incapable** of violating doctrine through application logic.

---

## **Deliverables**

- SQL: `public.transition_trade_state(...)` RPC (SECURITY DEFINER)

- SQL: `TRADE_STATE_TRANSITION` schema \+ event emission inside RPC

- SQL: Restrict direct trade updates (tighten RLS)

- Edge: `transition_trade_state` Edge function calling RPC

- Client SDK: `transitionTradeState(tradeId, toState, expectedVersion, makerChecker?)`

- Tests: extend E2E to use RPC only

---

## **Implementation**

# **A) SQL — RPC Function (Atomic transition \+ event write)**

File: `supabase/migrations/001_trade_transition_rpc.sql`

`-- ============================================================`  
`-- RPC: trade state transition (event-driven, atomic)`  
`-- ============================================================`

`-- Optional: transition event type schema contract is enforced at app layer.`  
`-- DB will still enforce subject_id presence via events constraint.`

`create or replace function public.transition_trade_state(`  
 `p_trade_id uuid,`  
 `p_to_state public.trade_state,`  
 `p_expected_version bigint,`  
 `p_checker_id uuid default null  -- required for irreversible moves`  
`) returns table (`  
 `trade_id uuid,`  
 `from_state public.trade_state,`  
 `to_state public.trade_state,`  
 `new_version bigint,`  
 `transition_event_id uuid`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_trade record;`  
 `v_required_ev text;`  
 `v_irreversible boolean;`  
 `v_org_id uuid;`  
 `v_actor uuid;`  
 `v_allowed boolean;`  
 `v_transition_event_id uuid;`  
`begin`  
 `-- Actor identity`  
 `v_actor := auth.uid();`  
 `if v_actor is null then`  
 `raise exception 'Unauthorized';`  
 `end if;`

`-- Org scoping from JWT`  
 `v_org_id := (auth.jwt() ->> 'org_id')::uuid;`  
 `if v_org_id is null then`  
 `raise exception 'Missing org_id in JWT';`  
 `end if;`

`-- Lock trade row for update (prevents concurrent transitions)`  
 `select *`  
 `into v_trade`  
 `from public.trades`  
 `where id = p_trade_id`  
 `for update;`

`if not found then`  
 `raise exception 'Trade not found';`  
 `end if;`

`-- Caller must be party to the trade`  
 `v_allowed := (v_trade.buyer_org_id = v_org_id) or (v_trade.supplier_org_id = v_org_id);`  
 `if not v_allowed then`  
 `raise exception 'Forbidden: caller org is not party to this trade';`  
 `end if;`

`-- Optimistic lock: expected version must match current version`  
 `if v_trade.version_id <> p_expected_version then`  
 `raise exception 'Optimistic lock violation: expected %, found %', p_expected_version, v_trade.version_id;`  
 `end if;`

`-- Transition rule lookup`  
 `select required_event_type, is_irreversible`  
 `into v_required_ev, v_irreversible`  
 `from public.trade_transitions`  
 `where from_state = v_trade.state`  
 `and to_state = p_to_state;`

`if not found then`  
 `raise exception 'Invalid trade transition: % -> %', v_trade.state, p_to_state;`  
 `end if;`

`-- Prerequisite event check (must exist for this trade)`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'trade'`  
 `and e.event_type = v_required_ev`  
 `and (e.payload->>'subject_id')::uuid = p_trade_id`  
 `and e.superseded_at is null`  
 `) then`  
 `raise exception 'Prerequisite event missing: % required for %', v_required_ev, p_to_state;`  
 `end if;`

`-- Maker–Checker enforcement for irreversible transitions`  
 `if v_irreversible then`  
 `if p_checker_id is null then`  
 `raise exception 'Checker required for irreversible transition';`  
 `end if;`

    `if p_checker_id = v_actor then`
      `raise exception 'Maker–Checker violation: maker and checker cannot be same user';`
    `end if;`

    `-- Checker must have privileged role in the same org`
    `if not exists (`
      `select 1`
      `from public.org_roles r`
      `where r.org_id = v_org_id`
        `and r.user_id = p_checker_id`
        `and r.role in ('RISK_COMPLIANCE_AUTHORITY','DOCTRINE_COUNCIL','SYSTEM_INTEGRITY')`
    `) then`
      `raise exception 'Checker not authorized for irreversible approval';`
    `end if;`

    `-- Require CHECKER_APPROVAL event present for this trade (subject_id = trade_id)`
    `if not exists (`
      `select 1`
      `from public.events e`
      `where e.event_domain = 'governance'`
        `and e.event_type = 'CHECKER_APPROVAL'`
        `and (e.payload->>'subject_id')::uuid = p_trade_id`
        `and (e.payload->>'maker_id')::uuid = v_actor`
        `and (e.payload->>'checker_id')::uuid = p_checker_id`
        `and e.superseded_at is null`
    `) then`
      `raise exception 'CHECKER_APPROVAL event missing for irreversible transition';`
    `end if;`

`end if;`

`-- Write TRADE_STATE_TRANSITION event (append-only)`  
 `insert into public.events (`  
 `event_domain,`  
 `event_type,`  
 `org_id,`  
 `actor_id,`  
 `payload,`  
 `schema_version,`  
 `reasoning_hash,`  
 `created_at,`  
 `effective_at`  
 `)`  
 `values (`  
 `'trade',`  
 `'TRADE_STATE_TRANSITION',`  
 `v_org_id,`  
 `v_actor,`  
 `jsonb_build_object(`  
 `'schema_version', '1.0',`  
 `'subject_id', p_trade_id,`  
 `'occurred_at', now(),`  
 `'from_state', v_trade.state::text,`  
 `'to_state', p_to_state::text,`  
 `'required_event_type', v_required_ev,`  
 `'is_irreversible', v_irreversible,`  
 `'maker_id', v_actor,`  
 `'checker_id', p_checker_id`  
 `),`  
 `'1.0',`  
 `null,`  
 `now(),`  
 `now()`  
 `)`  
 `returning id into v_transition_event_id;`

`-- Update trade state + bump version`  
 `update public.trades`  
 `set state = p_to_state,`  
 `version_id = version_id + 1,`  
 `effective_at = now()`  
 `where id = p_trade_id;`

`return query`  
 `select`  
 `p_trade_id,`  
 `v_trade.state,`  
 `p_to_state,`  
 `v_trade.version_id + 1,`  
 `v_transition_event_id;`

`end;`  
`$$;`

`-- Grant to authenticated users (RLS still applies)`  
`grant execute on function public.transition_trade_state(uuid, public.trade_state, bigint, uuid) to authenticated;`

---

# **B) SQL — Tighten Direct Updates (RLS Hardening)**

**Goal:** prevent “escape hatches” where client can update `state` directly.

Add/replace trade update policy to disallow direct `state` updates; allow only non-state fields (or none).

**Recommended (strict) approach:** remove update policy and require RPC for updates too.  
 If you need limited updates (e.g., draft edits), allow only when state is draft/rfq and block state changes.

File: `supabase/migrations/002_trades_rls_hardening.sql`

`-- Remove overly permissive update policy if present`  
`drop policy if exists "trades_update_limited_party" on public.trades;`

`-- Allow updates ONLY when state is draft/rfq AND state is unchanged`  
`create policy "trades_update_non_state_fields_only"`  
`on public.trades`  
`for update`  
`using (`  
 `(buyer_org_id = (auth.jwt() ->> 'org_id')::uuid or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid)`  
 `and state in ('draft','rfq_negotiating')`  
`)`  
`with check (`  
 `(buyer_org_id = (auth.jwt() ->> 'org_id')::uuid or supplier_org_id = (auth.jwt() ->> 'org_id')::uuid)`  
 `and state in ('draft','rfq_negotiating')`  
`);`

`-- Optional: add a trigger to forbid direct state updates unless coming from SECURITY DEFINER context.`  
`-- (Often unnecessary if updates are blocked by policy, but can be added if you want belt+suspenders.)`

In production discipline mode, you should eventually remove all direct updates and use RPCs for all mutations.

---

# **C) Edge Function — `transition_trade_state` (thin wrapper over RPC)**

File: `supabase/functions/transition_trade_state/index.ts`

`/// <reference lib="deno.ns" />`

`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

`Deno.serve(async (req) => {`  
 `try {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

    `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
    `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`

    `// Verify user using provided Authorization header`
    `const authHeader = req.headers.get("Authorization") ?? "";`
    `const userClient = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } }`
    `});`

    `const { data: userData, error: userErr } = await userClient.auth.getUser();`
    `if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);`

    `const body = await req.json().catch(() => null);`
    `if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);`

    `const { trade_id, to_state, expected_version, checker_id } = body as {`
      `trade_id: string;`
      `to_state: string;`
      `expected_version: number;`
      `checker_id?: string | null;`
    `};`

    `if (!trade_id || !to_state || typeof expected_version !== "number") {`
      `return jsonResponse({ error: "Missing required fields: trade_id,to_state,expected_version" }, 400);`
    `}`

    `// Call RPC as the user (so auth.uid() and JWT org_id apply)`
    `const userScopedClient = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } }`
    `});`

    `const { data, error } = await userScopedClient.rpc("transition_trade_state", {`
      `p_trade_id: trade_id,`
      `p_to_state: to_state,`
      `p_expected_version: expected_version,`
      `p_checker_id: checker_id ?? null`
    `});`

    `if (error) return jsonResponse({ error: error.message }, 422);`

    `return jsonResponse({ ok: true, result: data }, 200);`

`} catch (e) {`  
 `return jsonResponse({ error: "Unhandled error", details: String(e) }, 500);`  
 `}`  
`});`

---

# **D) Client SDK — `transitionTradeState(...)`**

File: `src/trades/transition.ts`

`export class TransitionError extends Error {`  
 `constructor(message: string, public status?: number, public details?: unknown) {`  
 `super(message);`  
 `}`  
`}`

`export async function transitionTradeState(params: {`  
 `tradeId: string;`  
 `toState: string;`  
 `expectedVersion: number;`  
 `checkerId?: string | null;`  
 `accessToken: string;`  
`}) {`  
 `const res = await fetch("/api/transition-trade-state", {`  
 `method: "POST",`  
 `headers: {`  
 `"Content-Type": "application/json",`  
 ``Authorization: `Bearer ${params.accessToken}`,``  
 `},`  
 `body: JSON.stringify({`  
 `trade_id: params.tradeId,`  
 `to_state: params.toState,`  
 `expected_version: params.expectedVersion,`  
 `checker_id: params.checkerId ?? null,`  
 `}),`  
 `});`

`const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch {}`

`if (!res.ok) {`  
 `throw new TransitionError(json?.error ?? "Transition failed", res.status, json ?? text);`  
 `}`

`return json as { ok: true; result: any };`  
`}`

### **Next.js route proxy**

File: `app/api/transition-trade-state/route.ts`

`import { NextResponse } from "next/server";`

`export async function POST(req: Request) {`  
 `const auth = req.headers.get("authorization") ?? "";`  
 `const body = await req.text();`

`const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;`  
 ``const functionUrl = `${supabaseUrl}/functions/v1/transition_trade_state`;``

`const res = await fetch(functionUrl, {`  
 `method: "POST",`  
 `headers: {`  
 `"content-type": "application/json",`  
 `authorization: auth,`  
 `},`  
 `body,`  
 `});`

`const text = await res.text();`  
 `return new NextResponse(text, {`  
 `status: res.status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

---

# **E) Tests — Update E2E Contract Test to use RPC only**

Update the previous E2E test:

- Replace `svc.from("trades").update({ state: ... })` with `transition_trade_state` RPC calls via Edge function.

**Acceptance criteria updates**

- Happy path transitions succeed via RPC

- Forbidden path transition returns 422 with prerequisite missing

- Maker–Checker missing checker returns 422

- Maker–Checker checker role invalid returns 403/422

---

# **Acceptance Criteria (for this ticket)**

- No production code path updates `trades.state` via raw UPDATE

- `transition_trade_state()` enforces prerequisite events and maker–checker

- RPC writes `TRADE_STATE_TRANSITION` event every time it transitions

- E2E contract test passes using RPC only

- Forbidden transition fails deterministically (422)

---

## **Next logical task (only one)**

**Next: replicate this pattern for `escrow_accounts.state` (escrow release RPC \+ maker–checker \+ prerequisite inspection event),** so trade settlement and escrow release become one locked, event-driven chain.

# **Ticket — Escrow Transition RPC (Event-Driven, Maker–Checker, Inspection-Gated)**

## **Goal**

Make escrow state changes **physically impossible** outside doctrine. All changes to `escrow_accounts.state` must go through a single DB RPC that:

1. Validates transition is allowed (`escrow_transitions`)

2. Validates prerequisite events exist in `events` for the **trade** (subject_id \= trade_id)

3. Enforces optimistic locking (via `escrow_accounts.version_id` **or** trade version)

4. Enforces Maker–Checker for irreversible release

5. Writes an `ESCROW_STATE_TRANSITION` event \+ updates escrow state **atomically**

6. Enforces org scoping (caller must be buyer org party for escrow)

This ensures escrow release cannot occur without:

- inspection uploaded

- escrow release authorized

- checker approval (and checker role)

---

## **Preconditions**

- v1.4 migration applied

- `events` ledger exists \+ append-only

- `trades` and `escrow_accounts` tables exist

- Edge `emit_event` exists and is already used to create prerequisite events:
  - `INSPECTION_REPORT_UPLOADED`

  - `CHECKER_APPROVAL`

  - `ESCROW_RELEASE_AUTHORIZED`

---

## **Deliverables**

- SQL: `public.transition_escrow_state(...)` RPC (SECURITY DEFINER, atomic)

- SQL: `escrow_transitions` table \+ seed rules

- SQL: add `version_id` column to `escrow_accounts` (recommended for clean optimistic locking)

- SQL: tighten RLS on `escrow_accounts` to block direct state updates

- Edge: `transition_escrow_state` function calling RPC

- Client: `transitionEscrowState(tradeId, toState, expectedVersion, checkerId?)`

- Tests: extend E2E contract test to settle escrow via RPC (happy \+ forbidden)

---

# **A) SQL — Add `version_id` to escrow_accounts (Optimistic Lock)**

File: `supabase/migrations/010_escrow_versioning.sql`

`alter table public.escrow_accounts`  
`add column if not exists version_id bigint not null default 1;`

`create index if not exists escrow_trade_version_idx`  
 `on public.escrow_accounts (trade_id, version_id);`

If you prefer using `trades.version_id` only, you can skip this, but escrow-level locking is cleaner.

---

# **B) SQL — Escrow Transition Rules Table (Pass 2 “Physical Laws”)**

File: `supabase/migrations/011_escrow_transitions.sql`

`create table if not exists public.escrow_transitions (`  
 `from_state public.escrow_state not null,`  
 `to_state public.escrow_state not null,`  
 `required_event_type text not null,`  
 `is_irreversible boolean not null default false,`  
 `primary key (from_state, to_state)`  
`);`

`-- Seed baseline rules:`  
`-- held -> releasable requires INSPECTION_REPORT_UPLOADED (compliance event)`  
`-- releasable -> released requires ESCROW_RELEASE_AUTHORIZED (trade event) and Maker–Checker`  
`insert into public.escrow_transitions (from_state, to_state, required_event_type, is_irreversible)`  
`values`  
`('held', 'releasable', 'INSPECTION_REPORT_UPLOADED', false),`  
`('releasable', 'released', 'ESCROW_RELEASE_AUTHORIZED', true)`  
`on conflict do nothing;`

---

# **C) SQL — Escrow Transition RPC (Atomic \+ Event Write)**

File: `supabase/migrations/012_escrow_transition_rpc.sql`

`create or replace function public.transition_escrow_state(`  
 `p_trade_id uuid,`  
 `p_to_state public.escrow_state,`  
 `p_expected_version bigint,`  
 `p_checker_id uuid default null`  
`) returns table (`  
 `trade_id uuid,`  
 `from_state public.escrow_state,`  
 `to_state public.escrow_state,`  
 `new_version bigint,`  
 `transition_event_id uuid`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_esc record;`  
 `v_trade record;`  
 `v_required_ev text;`  
 `v_irreversible boolean;`  
 `v_org_id uuid;`  
 `v_actor uuid;`  
 `v_transition_event_id uuid;`  
`begin`  
 `v_actor := auth.uid();`  
 `if v_actor is null then`  
 `raise exception 'Unauthorized';`  
 `end if;`

`v_org_id := (auth.jwt() ->> 'org_id')::uuid;`  
 `if v_org_id is null then`  
 `raise exception 'Missing org_id in JWT';`  
 `end if;`

`-- Lock escrow row for update (prevents concurrent transitions)`  
 `select *`  
 `into v_esc`  
 `from public.escrow_accounts`  
 `where trade_id = p_trade_id`  
 `for update;`

`if not found then`  
 `raise exception 'Escrow not found for trade';`  
 `end if;`

`-- Lock trade row (party and scoping checks)`  
 `select *`  
 `into v_trade`  
 `from public.trades`  
 `where id = p_trade_id`  
 `for update;`

`if not found then`  
 `raise exception 'Trade not found';`  
 `end if;`

`-- Escrow org scoping: buyer org is the escrow owner in baseline doctrine`  
 `if v_trade.buyer_org_id <> v_org_id then`  
 `raise exception 'Forbidden: only buyer org may transition escrow state';`  
 `end if;`

`-- Optimistic lock check`  
 `if v_esc.version_id <> p_expected_version then`  
 `raise exception 'Optimistic lock violation: expected %, found %', p_expected_version, v_esc.version_id;`  
 `end if;`

`-- Transition rule lookup`  
 `select required_event_type, is_irreversible`  
 `into v_required_ev, v_irreversible`  
 `from public.escrow_transitions`  
 `where from_state = v_esc.state`  
 `and to_state = p_to_state;`

`if not found then`  
 `raise exception 'Invalid escrow transition: % -> %', v_esc.state, p_to_state;`  
 `end if;`

`-- Prerequisite event must exist for this trade (subject_id = trade_id)`  
 `-- Note: required event domain varies:`  
 `-- - INSPECTION_REPORT_UPLOADED is typically compliance`  
 `-- - ESCROW_RELEASE_AUTHORIZED is trade`  
 `-- We do NOT enforce domain here; type is authoritative.`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_type = v_required_ev`  
 `and (e.payload->>'subject_id')::uuid = p_trade_id`  
 `and e.superseded_at is null`  
 `) then`  
 `raise exception 'Prerequisite event missing: % required for %', v_required_ev, p_to_state;`  
 `end if;`

`-- Maker–Checker enforcement for irreversible transitions (release)`  
 `if v_irreversible then`  
 `if p_checker_id is null then`  
 `raise exception 'Checker required for irreversible escrow release';`  
 `end if;`

    `if p_checker_id = v_actor then`
      `raise exception 'Maker–Checker violation: maker and checker cannot be same user';`
    `end if;`

    `-- Checker must have privileged role in the same org`
    `if not exists (`
      `select 1`
      `from public.org_roles r`
      `where r.org_id = v_org_id`
        `and r.user_id = p_checker_id`
        `and r.role in ('RISK_COMPLIANCE_AUTHORITY','DOCTRINE_COUNCIL','SYSTEM_INTEGRITY')`
    `) then`
      `raise exception 'Checker not authorized for escrow release';`
    `end if;`

    `-- Must have CHECKER_APPROVAL event for this trade, maker, checker, and action`
    `if not exists (`
      `select 1`
      `from public.events e`
      `where e.event_domain = 'governance'`
        `and e.event_type = 'CHECKER_APPROVAL'`
        `and (e.payload->>'subject_id')::uuid = p_trade_id`
        `and (e.payload->>'maker_id')::uuid = v_actor`
        `and (e.payload->>'checker_id')::uuid = p_checker_id`
        `and (e.payload->>'action') = 'ESCROW_RELEASE_AUTHORIZED'`
        `and e.superseded_at is null`
    `) then`
      `raise exception 'CHECKER_APPROVAL event missing for escrow release';`
    `end if;`

`end if;`

`-- Write ESCROW_STATE_TRANSITION event`  
 `insert into public.events (`  
 `event_domain,`  
 `event_type,`  
 `org_id,`  
 `actor_id,`  
 `payload,`  
 `schema_version,`  
 `reasoning_hash,`  
 `created_at,`  
 `effective_at`  
 `)`  
 `values (`  
 `'trade',`  
 `'ESCROW_STATE_TRANSITION',`  
 `v_org_id,`  
 `v_actor,`  
 `jsonb_build_object(`  
 `'schema_version', '1.0',`  
 `'subject_id', p_trade_id,`  
 `'occurred_at', now(),`  
 `'from_state', v_esc.state::text,`  
 `'to_state', p_to_state::text,`  
 `'required_event_type', v_required_ev,`  
 `'is_irreversible', v_irreversible,`  
 `'maker_id', v_actor,`  
 `'checker_id', p_checker_id`  
 `),`  
 `'1.0',`  
 `null,`  
 `now(),`  
 `now()`  
 `)`  
 `returning id into v_transition_event_id;`

`-- Update escrow state + bump version`  
 `update public.escrow_accounts`  
 `set state = p_to_state,`  
 `version_id = version_id + 1,`  
 `effective_at = now()`  
 `where trade_id = p_trade_id;`

`return query`  
 `select`  
 `p_trade_id,`  
 `v_esc.state,`  
 `p_to_state,`  
 `v_esc.version_id + 1,`  
 `v_transition_event_id;`

`end;`  
`$$;`

`grant execute on function public.transition_escrow_state(uuid, public.escrow_state, bigint, uuid) to authenticated;`

---

# **D) SQL — Tighten RLS: Block Direct Escrow State Mutations**

File: `supabase/migrations/013_escrow_rls_hardening.sql`

`-- Escrow is buyer-scoped (baseline). Reads already scoped by org_id.`  
`-- Remove broad write policy if you have one.`  
`drop policy if exists "escrow_write_own_org" on public.escrow_accounts;`

`-- Allow SELECT only (writes via RPC)`  
`create policy "escrow_select_own_org"`  
`on public.escrow_accounts`  
`for select`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`-- OPTIONAL: allow insert only at trade creation time via service_role or RPC.`  
`-- Safer: no insert/update/delete for authenticated directly.`

If you need escrow creation by tenant flows, add a separate RPC `create_escrow_account()`.

---

# **E) Edge Function — `transition_escrow_state`**

File: `supabase/functions/transition_escrow_state/index.ts`

`/// <reference lib="deno.ns" />`  
`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

`Deno.serve(async (req) => {`  
 `try {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

    `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
    `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
    `const authHeader = req.headers.get("Authorization") ?? "";`

    `// Verify user`
    `const userClient = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } },`
    `});`
    `const { data: userData, error: userErr } = await userClient.auth.getUser();`
    `if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);`

    `const body = await req.json().catch(() => null);`
    `if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);`

    `const { trade_id, to_state, expected_version, checker_id } = body as {`
      `trade_id: string;`
      `to_state: string;`
      `expected_version: number;`
      `checker_id?: string | null;`
    `};`

    `if (!trade_id || !to_state || typeof expected_version !== "number") {`
      `return jsonResponse({ error: "Missing required fields: trade_id,to_state,expected_version" }, 400);`
    `}`

    `// Call RPC as user (so auth.uid() + jwt org_id apply)`
    `const userScoped = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } },`
    `});`

    `const { data, error } = await userScoped.rpc("transition_escrow_state", {`
      `p_trade_id: trade_id,`
      `p_to_state: to_state,`
      `p_expected_version: expected_version,`
      `p_checker_id: checker_id ?? null,`
    `});`

    `if (error) return jsonResponse({ error: error.message }, 422);`

    `return jsonResponse({ ok: true, result: data }, 200);`

`} catch (e) {`  
 `return jsonResponse({ error: "Unhandled error", details: String(e) }, 500);`  
 `}`  
`});`

---

# **F) Client SDK — `transitionEscrowState(...)`**

File: `src/escrow/transition.ts`

`export class EscrowTransitionError extends Error {`  
 `constructor(message: string, public status?: number, public details?: unknown) {`  
 `super(message);`  
 `}`  
`}`

`export async function transitionEscrowState(params: {`  
 `tradeId: string;`  
 `toState: "held" | "releasable" | "released";`  
 `expectedVersion: number;`  
 `checkerId?: string | null;`  
 `accessToken: string;`  
`}) {`  
 `const res = await fetch("/api/transition-escrow-state", {`  
 `method: "POST",`  
 `headers: {`  
 `"Content-Type": "application/json",`  
 ``Authorization: `Bearer ${params.accessToken}`,``  
 `},`  
 `body: JSON.stringify({`  
 `trade_id: params.tradeId,`  
 `to_state: params.toState,`  
 `expected_version: params.expectedVersion,`  
 `checker_id: params.checkerId ?? null,`  
 `}),`  
 `});`

`const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch {}`

`if (!res.ok) {`  
 `throw new EscrowTransitionError(json?.error ?? "Escrow transition failed", res.status, json ?? text);`  
 `}`

`return json as { ok: true; result: any };`  
`}`

### **Next.js route proxy**

File: `app/api/transition-escrow-state/route.ts`

`import { NextResponse } from "next/server";`

`export async function POST(req: Request) {`  
 `const auth = req.headers.get("authorization") ?? "";`  
 `const body = await req.text();`

`const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;`  
 ``const functionUrl = `${supabaseUrl}/functions/v1/transition_escrow_state`;``

`const res = await fetch(functionUrl, {`  
 `method: "POST",`  
 `headers: {`  
 `"content-type": "application/json",`  
 `authorization: auth,`  
 `},`  
 `body,`  
 `});`

`const text = await res.text();`  
 `return new NextResponse(text, {`  
 `status: res.status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

---

# **G) Tests — Extend E2E Contract Test (Escrow Happy \+ Forbidden)**

## **Happy path**

1. Ensure escrow row exists for trade (`escrow_accounts.trade_id = tradeId`, `org_id = buyer_org_id`, `state='held'`, `version_id=1`)

2. Emit `INSPECTION_REPORT_UPLOADED` (subject_id=tradeId)

3. RPC: `held → releasable` with expected_version=1

4. Emit `CHECKER_APPROVAL` (subject_id=tradeId, maker_id, checker_id, action='ESCROW_RELEASE_AUTHORIZED')

5. Emit `ESCROW_RELEASE_AUTHORIZED` (subject_id=tradeId)

6. RPC: `releasable → released` with expected_version=2 \+ checker_id

## **Forbidden path**

- Attempt `held → releasable` without inspection event → must fail (422)

- Attempt `releasable → released` without checker approval event → must fail (422)

- Attempt release with checker not privileged → must fail (422)

---

# **Acceptance Criteria**

- Escrow state changes succeed only via `transition_escrow_state()` RPC

- DB enforces prerequisite event existence

- Irreversible release requires checker_id and checker role

- RPC writes `ESCROW_STATE_TRANSITION` event on every transition

- Direct authenticated UPDATE/DELETE on escrow_accounts is blocked by RLS

- E2E tests prove happy path \+ forbidden path deterministically

---

## **Next logical task (only one)**

**Next: unify “settlement” into a single orchestrated flow**: when escrow transitions to `released`, automatically (or via a chained RPC) transition trade `inspected → settled` using the trade RPC, so settlement becomes a guaranteed, auditable two-step.

# **Ticket — Settlement Orchestrator (Escrow Release → Trade Settled, Audited, Deterministic)**

## **Goal**

Guarantee that “settlement” is not a UI concept but a **system-enforced chain**:

When escrow reaches **`released`**, the trade must reach **`settled`** through a controlled, audited pathway.

This ticket implements a **Settlement Orchestrator** that:

1. Executes escrow transition `releasable → released` via the escrow RPC

2. Immediately transitions trade `inspected → settled` via the trade RPC

3. Writes a single orchestration event `SETTLEMENT_ORCHESTRATED` linking both transitions

4. Enforces maker–checker once (reused for both transitions)

5. Is deterministic: if step 2 fails, step 1 is rolled back (atomic), or the orchestrator enters a recoverable “pending” state (staged)

---

## **Choose Implementation Mode (Default: Atomic)**

### **Mode A — Atomic (Recommended)**

Single DB transaction ensures:

- escrow release and trade settlement succeed together, or not at all.

### **Mode B — Staged (Only if you must)**

Writes a “pending settlement” event and uses a retry worker.  
 (You said “don’t lose focus”; atomic avoids drift, retries, and partial truth.)

This ticket ships **Mode A**.

---

## **Deliverables**

- SQL: `public.orchestrate_settlement(...)` RPC (SECURITY DEFINER, atomic)

- SQL: `SETTLEMENT_ORCHESTRATED` event written by orchestrator

- Edge function: `settle_trade` calling orchestrator RPC

- Client SDK: `settleTrade({ tradeId, escrowExpectedVersion, tradeExpectedVersion, checkerId })`

- Tests: Extend E2E contract test to call orchestrator only (happy \+ forbidden)

---

# **A) SQL — Settlement Orchestrator RPC (Atomic)**

File: `supabase/migrations/020_settlement_orchestrator.sql`

`create or replace function public.orchestrate_settlement(`  
 `p_trade_id uuid,`  
 `p_escrow_expected_version bigint,`  
 `p_trade_expected_version bigint,`  
 `p_checker_id uuid`  
`) returns table (`  
 `trade_id uuid,`  
 `escrow_transition_event_id uuid,`  
 `trade_transition_event_id uuid,`  
 `orchestration_event_id uuid,`  
 `escrow_new_version bigint,`  
 `trade_new_version bigint`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_actor uuid;`  
 `v_org_id uuid;`

`v_esc_res record;`  
 `v_trade_res record;`

`v_orch_event_id uuid;`  
`begin`  
 `v_actor := auth.uid();`  
 `if v_actor is null then`  
 `raise exception 'Unauthorized';`  
 `end if;`

`v_org_id := (auth.jwt() ->> 'org_id')::uuid;`  
 `if v_org_id is null then`  
 `raise exception 'Missing org_id in JWT';`  
 `end if;`

`if p_checker_id is null then`  
 `raise exception 'Checker required for settlement orchestration';`  
 `end if;`

`if p_checker_id = v_actor then`  
 `raise exception 'Maker–Checker violation: maker and checker cannot be same user';`  
 `end if;`

`-- Step 0: Ensure CHECKER_APPROVAL exists for escrow release (single approval reused)`  
 `-- action = ESCROW_RELEASE_AUTHORIZED`  
 `if not exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'CHECKER_APPROVAL'`  
 `and (e.payload->>'subject_id')::uuid = p_trade_id`  
 `and (e.payload->>'maker_id')::uuid = v_actor`  
 `and (e.payload->>'checker_id')::uuid = p_checker_id`  
 `and (e.payload->>'action') = 'ESCROW_RELEASE_AUTHORIZED'`  
 `and e.superseded_at is null`  
 `) then`  
 `raise exception 'CHECKER_APPROVAL missing: required for settlement orchestration';`  
 `end if;`

`-- Step 1: Transition escrow releasable -> released (will enforce prerequisites and checker)`  
 `select *`  
 `into v_esc_res`  
 `from public.transition_escrow_state(`  
 `p_trade_id,`  
 `'released',`  
 `p_escrow_expected_version,`  
 `p_checker_id`  
 `);`

`-- Step 2: Transition trade inspected -> settled (will enforce prerequisites and checker approval event)`  
 `-- Note: trade transition rules currently require ESCROW_RELEASE_AUTHORIZED prerequisite for inspected->settled.`  
 `-- We assume ESCROW_RELEASE_AUTHORIZED event was emitted prior to calling this orchestrator.`  
 `select *`  
 `into v_trade_res`  
 `from public.transition_trade_state(`  
 `p_trade_id,`  
 `'settled',`  
 `p_trade_expected_version,`  
 `p_checker_id`  
 `);`

`-- Step 3: Write orchestration event linking both transitions`  
 `insert into public.events (`  
 `event_domain,`  
 `event_type,`  
 `org_id,`  
 `actor_id,`  
 `payload,`  
 `schema_version,`  
 `reasoning_hash,`  
 `created_at,`  
 `effective_at`  
 `)`  
 `values (`  
 `'trade',`  
 `'SETTLEMENT_ORCHESTRATED',`  
 `v_org_id,`  
 `v_actor,`  
 `jsonb_build_object(`  
 `'schema_version', '1.0',`  
 `'subject_id', p_trade_id,`  
 `'occurred_at', now(),`  
 `'escrow_transition_event_id', v_esc_res.transition_event_id,`  
 `'trade_transition_event_id', v_trade_res.transition_event_id,`  
 `'maker_id', v_actor,`  
 `'checker_id', p_checker_id`  
 `),`  
 `'1.0',`  
 `null,`  
 `now(),`  
 `now()`  
 `)`  
 `returning id into v_orch_event_id;`

`return query`  
 `select`  
 `p_trade_id,`  
 `v_esc_res.transition_event_id,`  
 `v_trade_res.transition_event_id,`  
 `v_orch_event_id,`  
 `v_esc_res.new_version,`  
 `v_trade_res.new_version;`

`end;`  
`$$;`

`grant execute on function public.orchestrate_settlement(uuid, bigint, bigint, uuid) to authenticated;`

### **Orchestrator Preconditions (explicit)**

For `orchestrate_settlement()` to succeed, the following must already exist:

- `INSPECTION_REPORT_UPLOADED` event (subject_id=tradeId) — to allow escrow: held → releasable earlier

- escrow must already be in `releasable` state

- trade must already be in `inspected` state

- `ESCROW_RELEASE_AUTHORIZED` event (subject_id=tradeId)

- `CHECKER_APPROVAL` event (subject_id=tradeId, maker_id, checker_id, action='ESCROW_RELEASE_AUTHORIZED')

This keeps doctrine clean: **authorization happens via events**, orchestration happens via RPC.

---

# **B) Edge Function — `settle_trade`**

File: `supabase/functions/settle_trade/index.ts`

`/// <reference lib="deno.ns" />`  
`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

`Deno.serve(async (req) => {`  
 `try {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

    `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
    `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
    `const authHeader = req.headers.get("Authorization") ?? "";`

    `const userClient = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } },`
    `});`

    `const { data: userData, error: userErr } = await userClient.auth.getUser();`
    `if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);`

    `const body = await req.json().catch(() => null);`
    `if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);`

    `const { trade_id, escrow_expected_version, trade_expected_version, checker_id } = body as {`
      `trade_id: string;`
      `escrow_expected_version: number;`
      `trade_expected_version: number;`
      `checker_id: string;`
    `};`

    `if (!trade_id || typeof escrow_expected_version !== "number" || typeof trade_expected_version !== "number" || !checker_id) {`
      `return jsonResponse({ error: "Missing required fields" }, 400);`
    `}`

    `// Call orchestrator RPC as user (so auth.uid + jwt org apply)`
    `const userScoped = createClient(supabaseUrl, serviceKey, {`
      `global: { headers: { Authorization: authHeader } },`
    `});`

    `const { data, error } = await userScoped.rpc("orchestrate_settlement", {`
      `p_trade_id: trade_id,`
      `p_escrow_expected_version: escrow_expected_version,`
      `p_trade_expected_version: trade_expected_version,`
      `p_checker_id: checker_id,`
    `});`

    `if (error) return jsonResponse({ error: error.message }, 422);`

    `return jsonResponse({ ok: true, result: data }, 200);`

`} catch (e) {`  
 `return jsonResponse({ error: "Unhandled error", details: String(e) }, 500);`  
 `}`  
`});`

---

# **C) Client SDK — `settleTrade(...)`**

File: `src/settlement/settleTrade.ts`

`export class SettlementError extends Error {`  
 `constructor(message: string, public status?: number, public details?: unknown) {`  
 `super(message);`  
 `}`  
`}`

`export async function settleTrade(params: {`  
 `tradeId: string;`  
 `escrowExpectedVersion: number;`  
 `tradeExpectedVersion: number;`  
 `checkerId: string;`  
 `accessToken: string;`  
`}) {`  
 `const res = await fetch("/api/settle-trade", {`  
 `method: "POST",`  
 `headers: {`  
 `"Content-Type": "application/json",`  
 ``Authorization: `Bearer ${params.accessToken}`,``  
 `},`  
 `body: JSON.stringify({`  
 `trade_id: params.tradeId,`  
 `escrow_expected_version: params.escrowExpectedVersion,`  
 `trade_expected_version: params.tradeExpectedVersion,`  
 `checker_id: params.checkerId,`  
 `}),`  
 `});`

`const text = await res.text();`  
 `let json: any = null;`  
 `try { json = JSON.parse(text); } catch {}`

`if (!res.ok) {`  
 `throw new SettlementError(json?.error ?? "Settlement failed", res.status, json ?? text);`  
 `}`

`return json as { ok: true; result: any };`  
`}`

### **Next.js route proxy**

File: `app/api/settle-trade/route.ts`

`import { NextResponse } from "next/server";`

`export async function POST(req: Request) {`  
 `const auth = req.headers.get("authorization") ?? "";`  
 `const body = await req.text();`

`const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;`  
 ``const functionUrl = `${supabaseUrl}/functions/v1/settle_trade`;``

`const res = await fetch(functionUrl, {`  
 `method: "POST",`  
 `headers: {`  
 `"content-type": "application/json",`  
 `authorization: auth,`  
 `},`  
 `body,`  
 `});`

`const text = await res.text();`  
 `return new NextResponse(text, {`  
 `status: res.status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

---

# **D) Tests — Extend E2E Contract Test (Orchestrator)**

## **Happy path additions**

1. Ensure trade is at `inspected` and escrow is at `releasable`

2. Ensure events exist:
   - `ESCROW_RELEASE_AUTHORIZED`

   - `CHECKER_APPROVAL (action=ESCROW_RELEASE_AUTHORIZED)`

3. Call **orchestrator** (Edge `settle_trade` or RPC)

4. Verify:
   - escrow state now `released`

   - trade state now `settled`

   - `SETTLEMENT_ORCHESTRATED` event exists and references both transition event ids

## **Forbidden path additions**

- Call orchestrator **without** `ESCROW_RELEASE_AUTHORIZED` event → fails 422

- Call orchestrator **without** `CHECKER_APPROVAL` event → fails 422

- Call orchestrator with maker==checker → fails 422

- Call orchestrator with stale versions → fails optimistic lock error

---

# **Acceptance Criteria**

- One call transitions escrow to `released` AND trade to `settled` atomically

- Always writes `SETTLEMENT_ORCHESTRATED` event with linkage IDs

- Maker–Checker enforced for settlement

- Missing prerequisite events reliably produce 422 errors

- E2E tests cover happy \+ forbidden paths

---

## **Next logical task (only one)**

**Next: add a “Kill-Switch Guard” to RPCs** — if platform or tenant is in `read_only` / `approval_only`, RPCs must refuse transitions (except governance-approved overrides). This is the bridge from Doctrine v1.2 kill-switches to runtime enforcement.

# **Ticket — Kill-Switch Guard for RPCs (Read-Only / Approval-Only Enforcement \+ Overrides)**

## **Goal**

Bridge Doctrine v1.2 kill-switches into **runtime enforcement** by hardening all critical RPCs so they **refuse transitions** when:

- **Platform** is in `read_only`

- **Tenant** is in `read_only` or `approval_only`

- **Trade/Domain** kill-switch is active (optional scope extensions)

Except when a **dual-signed DOCTRINE_OVERRIDE** exists for the specific action \+ subject.

This prevents “business as usual” during systemic risk and forces governance into the execution path.

---

## **Deliverables**

1. SQL tables:

- `control_plane_flags` (platform-wide)

- `tenant_flags` (org-scoped)

2. SQL functions:

- `is_platform_read_only()`

- `get_tenant_mode(org_id)`

- `require_not_frozen(action, subject_id, org_id, actor_id)` (raises exception)

- `has_doctrine_override(action, subject_id, org_id, maker_id, checker_id)` (dual-signed)

3. RPC hardening:

- Add guard calls at the top of:
  - `transition_trade_state`

  - `transition_escrow_state`

  - `orchestrate_settlement`

4. Seed flags \+ event types mapping guidance

5. Tests:

- Read-only blocks transitions (422)

- Approval-only blocks transitions unless “checker_id” present AND override exists (or unless you choose “approval-only means checker always required”)

- Override allows transition

---

# **A) SQL — Control Plane Flags \+ Tenant Flags**

File: `supabase/migrations/030_kill_switch_flags.sql`

`do $$ begin`  
 `create type public.platform_mode as enum ('normal', 'read_only', 'approval_only');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.control_plane_flags (`  
 `key text primary key,`  
 `mode public.platform_mode not null default 'normal',`  
 `updated_at timestamptz not null default now(),`  
 `updated_by uuid null references auth.users(id)`  
`);`

`-- single row convention: key='PLATFORM_MODE'`  
`insert into public.control_plane_flags (key, mode)`  
`values ('PLATFORM_MODE', 'normal')`  
`on conflict (key) do nothing;`

`create table if not exists public.tenant_flags (`  
 `org_id uuid not null references public.organizations(id),`  
 `key text not null,`  
 `mode public.platform_mode not null default 'normal',`  
 `updated_at timestamptz not null default now(),`  
 `updated_by uuid null references auth.users(id),`  
 `primary key (org_id, key)`  
`);`

`-- convention key: 'TENANT_MODE'`

### **RLS for flags (Control Plane sovereignty)**

Only service role / privileged governance should mutate. For now: **no tenant writes**.

`alter table public.control_plane_flags enable row level security;`  
`alter table public.tenant_flags enable row level security;`

`-- Everyone can read platform mode (optional). Safer: authenticated can read.`  
`drop policy if exists "cpf_read" on public.control_plane_flags;`  
`create policy "cpf_read"`  
`on public.control_plane_flags`  
`for select`  
`to authenticated`  
`using (true);`

`-- No tenant writes (writes via service role only)`  
`revoke insert, update, delete on public.control_plane_flags from authenticated;`  
`revoke insert, update, delete on public.tenant_flags from authenticated;`

`-- Tenant can read its own flag (optional)`  
`drop policy if exists "tenant_flags_read_own" on public.tenant_flags;`  
`create policy "tenant_flags_read_own"`  
`on public.tenant_flags`  
`for select`  
`to authenticated`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

---

# **B) SQL — Guard Functions (Single Source of Truth)**

File: `supabase/migrations/031_kill_switch_guards.sql`

`create or replace function public.is_platform_read_only()`  
`returns public.platform_mode`  
`language sql`  
`stable`  
`as $$`  
 `select mode`  
 `from public.control_plane_flags`  
 `where key = 'PLATFORM_MODE'`  
`$$;`

`create or replace function public.get_tenant_mode(p_org_id uuid)`  
`returns public.platform_mode`  
`language sql`  
`stable`  
`as $$`  
 `select coalesce(`  
 `(select mode from public.tenant_flags where org_id = p_org_id and key = 'TENANT_MODE'),`  
 `'normal'::public.platform_mode`  
 `)`  
`$$;`

`-- Dual-signed override requirement:`  
`-- We treat override as an event that must exist in the ledger.`  
`-- event_domain='governance', event_type='DOCTRINE_OVERRIDE'`  
`-- payload: { subject_id, occurred_at, override_reason, maker_id, checker_id, action }`  
`create or replace function public.has_doctrine_override(`  
 `p_action text,`  
 `p_subject_id uuid,`  
 `p_org_id uuid,`  
 `p_maker_id uuid,`  
 `p_checker_id uuid`  
`) returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select exists (`  
 `select 1`  
 `from public.events e`  
 `where e.event_domain = 'governance'`  
 `and e.event_type = 'DOCTRINE_OVERRIDE'`  
 `and e.org_id = p_org_id`  
 `and (e.payload->>'subject_id')::uuid = p_subject_id`  
 `and (e.payload->>'maker_id')::uuid = p_maker_id`  
 `and (e.payload->>'checker_id')::uuid = p_checker_id`  
 `and (e.payload->>'action') = p_action`  
 `and (e.payload->>'maker_id') <> (e.payload->>'checker_id')`  
 `and e.superseded_at is null`  
 `);`  
`$$;`

`-- Main guard: throws if blocked.`  
`-- p_checker_id is optional but needed for overrides and approval_only.`  
`create or replace function public.require_not_frozen(`  
 `p_action text,`  
 `p_subject_id uuid,`  
 `p_org_id uuid,`  
 `p_actor_id uuid,`  
 `p_checker_id uuid default null`  
`) returns void`  
`language plpgsql`  
`stable`  
`as $$`  
`declare`  
 `v_platform_mode public.platform_mode;`  
 `v_tenant_mode public.platform_mode;`  
`begin`  
 `v_platform_mode := public.is_platform_read_only();`  
 `v_tenant_mode := public.get_tenant_mode(p_org_id);`

`-- PLATFORM READ ONLY: block unless override exists`  
 `if v_platform_mode = 'read_only' then`  
 `if p_checker_id is not null`  
 `and public.has_doctrine_override(p_action, p_subject_id, p_org_id, p_actor_id, p_checker_id)`  
 `then`  
 `return;`  
 `end if;`  
 `raise exception 'Kill-Switch: PLATFORM read_only blocks action %', p_action;`  
 `end if;`

`-- TENANT READ ONLY: block unless override exists`  
 `if v_tenant_mode = 'read_only' then`  
 `if p_checker_id is not null`  
 `and public.has_doctrine_override(p_action, p_subject_id, p_org_id, p_actor_id, p_checker_id)`  
 `then`  
 `return;`  
 `end if;`  
 `raise exception 'Kill-Switch: TENANT read_only blocks action %', p_action;`  
 `end if;`

`-- APPROVAL ONLY:`  
 `-- Rule: All guarded actions require checker_id; optional override not needed here.`  
 `-- (If you prefer approval_only to still need override, flip logic.)`  
 `if v_platform_mode = 'approval_only' or v_tenant_mode = 'approval_only' then`  
 `if p_checker_id is null then`  
 `raise exception 'Kill-Switch: approval_only requires checker for action %', p_action;`  
 `end if;`  
 `end if;`

`return;`  
`end;`  
`$$;`

**Design choice embedded above (simple \+ disciplined):**

- `approval_only` means: _no unchecked mutations_ — checker is mandatory.

- `read_only` means: _no mutations at all_ unless a **DOCTRINE_OVERRIDE** exists.

---

# **C) Harden the RPCs (Trade / Escrow / Settlement)**

## **1\) `transition_trade_state(...)` — add guard at top**

At the start of the function (after actor/org extraction), add:

`perform public.require_not_frozen(`  
 `'transition_trade_state',`  
 `p_trade_id,`  
 `v_org_id,`  
 `v_actor,`  
 `p_checker_id`  
`);`

## **2\) `transition_escrow_state(...)` — add guard at top**

`perform public.require_not_frozen(`  
 `'transition_escrow_state',`  
 `p_trade_id,`  
 `v_org_id,`  
 `v_actor,`  
 `p_checker_id`  
`);`

## **3\) `orchestrate_settlement(...)` — add guard at top**

`perform public.require_not_frozen(`  
 `'orchestrate_settlement',`  
 `p_trade_id,`  
 `v_org_id,`  
 `v_actor,`  
 `p_checker_id`  
`);`

File: `supabase/migrations/032_rpc_kill_switch_patch.sql`  
 (Implement as `create or replace function ...` for each RPC with the guard inserted.)

---

# **D) Governance Event Contract (Override)**

To unblock a read-only system you must emit:

`DOCTRINE_OVERRIDE` payload must include:

- `subject_id` \= trade_id

- `action` \= one of:
  - `transition_trade_state`

  - `transition_escrow_state`

  - `orchestrate_settlement`

- `maker_id`, `checker_id` (different)

- `override_reason`

This is already in your schemas; ensure Edge schema pack includes `action` for override (it does).

---

# **E) Tests (E2E \+ Unit)**

## **Test cases**

1. **Platform read_only blocks trade transition**

- set `control_plane_flags.PLATFORM_MODE = 'read_only'`

- call `transition_trade_state` → expect 422 \+ message contains `PLATFORM read_only`

2. **Tenant read_only blocks escrow transition**

- set `tenant_flags(org_id,'TENANT_MODE') = 'read_only'`

- call `transition_escrow_state` → expect 422

3. **read_only override allows**

- emit `DOCTRINE_OVERRIDE` with maker/checker for action \+ subject

- call RPC with checker_id → succeeds

4. **approval_only requires checker**

- set platform_mode \= approval_only

- call RPC without checker_id → fails 422

- call with checker_id (authorized) → proceeds (assuming other prereqs satisfied)

Use service role in tests to flip flags. Use Maker/Checker JWTs for RPC calls.

---

# **Acceptance Criteria**

- All three RPCs refuse mutations when platform/tenant read_only

- Approval-only enforces checker requirement

- Dual-signed DOCTRINE_OVERRIDE unblocks read_only actions

- E2E tests cover: block, override, approval_only

- No other state mutation path bypasses these guards

---

## **Next logical task (only one)**

**Next: “Kill-Switch Activation Path”** — implement the governance-controlled mechanism to set `PLATFORM_MODE` / `TENANT_MODE` via a `KILL_SWITCH_ACTIVATED` event \+ maker–checker \+ a service-role worker that applies the flag tables. This completes the loop: governance event → enforced runtime state.

# **Ticket — Kill-Switch Activation Path (Governance Event → Applied Flags → Enforced RPC Guards)**

## **Goal**

Complete the governance loop:

**KILL_SWITCH_ACTIVATED (event)**  
 → validated \+ maker–checker enforced  
 → **service-role worker applies flags** (`control_plane_flags` / `tenant_flags`)  
 → RPC guards block or require approval accordingly.

This makes kill-switches _governed_, _auditable_, and _operationally executable_.

---

## **Architecture (Disciplined \+ Minimal)**

### **Step 1 — Governance writes intent (append-only)**

- Event: `KILL_SWITCH_ACTIVATED`

- Required: `maker_id`, `checker_id` (4-eyes, maker \!= checker)

- Scope: platform or tenant

- Mode: `read_only` or `approval_only`

- Reason: mandatory

### **Step 2 — Service-role worker applies state (idempotent)**

- Reads unapplied kill-switch events (or listens via a cron job)

- Applies to:
  - `control_plane_flags(key='PLATFORM_MODE')`

  - or `tenant_flags(org_id, key='TENANT_MODE')`

- Writes an `KILL_SWITCH_APPLIED` event with linkage (event_id, resulting mode)

### **Step 3 — Runtime enforcement already exists**

- RPC guard `require_not_frozen()` uses these flag tables.

---

## **Deliverables**

1. SQL:
   - `kill_switch_state` enum (optional; you already have `platform_mode`)

   - `kill_switch_applications` table (idempotency \+ audit)

   - `public.apply_kill_switch_event(p_event_id uuid)` RPC (service-role only)

2. Edge Function (service-role):
   - `apply_kill_switches` worker (manual trigger \+ optional cron)

3. Schema pack additions:
   - `KILL_SWITCH_APPLIED` JSON schema

4. Tests:
   - maker-checker required to activate kill-switch

   - worker applies flags

   - RPC transitions are blocked after application

---

# **A) SQL — Idempotency Table \+ Apply Function**

File: `supabase/migrations/040_kill_switch_apply.sql`

`-- Idempotency / application log`  
`create table if not exists public.kill_switch_applications (`  
 `event_id uuid primary key references public.events(id),`  
 `applied_at timestamptz not null default now(),`  
 `applied_by text not null default 'worker', -- or user id if needed`  
 `result_mode public.platform_mode not null,`  
 `scope text not null,        -- 'platform' | 'tenant'`  
 `scope_org_id uuid null`  
`);`

`alter table public.kill_switch_applications enable row level security;`  
`-- No tenant access`  
`revoke select, insert, update, delete on public.kill_switch_applications from authenticated;`

`-- Helper: ensure maker-checker + privileged checker roles`  
`create or replace function public.enforce_maker_checker_for_kill_switch(`  
 `p_org_id uuid,`  
 `p_maker_id uuid,`  
 `p_checker_id uuid`  
`) returns void`  
`language plpgsql`  
`stable`  
`as $$`  
`begin`  
 `if p_checker_id is null or p_maker_id is null then`  
 `raise exception 'maker_id and checker_id required';`  
 `end if;`

`if p_maker_id = p_checker_id then`  
 `raise exception 'Maker–Checker violation: maker and checker cannot match';`  
 `end if;`

`-- Checker must be privileged in org (if platform scope, use maker org as governance org)`  
 `if not exists (`  
 `select 1`  
 `from public.org_roles r`  
 `where r.org_id = p_org_id`  
 `and r.user_id = p_checker_id`  
 `and r.role in ('RISK_COMPLIANCE_AUTHORITY','DOCTRINE_COUNCIL','SYSTEM_INTEGRITY')`  
 `) then`  
 `raise exception 'Checker not authorized for kill-switch';`  
 `end if;`  
`end;`  
`$$;`

`-- Apply a single KILL_SWITCH_ACTIVATED event (service role should call this)`  
`create or replace function public.apply_kill_switch_event(p_event_id uuid)`  
`returns table (`  
 `applied boolean,`  
 `scope text,`  
 `mode public.platform_mode,`  
 `org_id uuid`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `e record;`  
 `p jsonb;`  
 `v_scope text;`  
 `v_mode public.platform_mode;`  
 `v_target_org uuid;`  
 `v_maker uuid;`  
 `v_checker uuid;`  
 `v_reason text;`  
`begin`  
 `-- Idempotency: if already applied, return existing`  
 `if exists (select 1 from public.kill_switch_applications where event_id = p_event_id) then`  
 `return query`  
 `select true, k.scope, k.result_mode, k.scope_org_id`  
 `from public.kill_switch_applications k`  
 `where k.event_id = p_event_id;`  
 `return;`  
 `end if;`

`select * into e`  
 `from public.events`  
 `where id = p_event_id`  
 `and event_domain = 'governance'`  
 `and event_type = 'KILL_SWITCH_ACTIVATED';`

`if not found then`  
 `raise exception 'Event not found or not KILL_SWITCH_ACTIVATED';`  
 `end if;`

`p := e.payload;`

`-- Required payload keys`  
 `if not (p ? 'scope' and p ? 'mode' and p ? 'maker_id' and p ? 'checker_id' and p ? 'reason') then`  
 `raise exception 'Invalid kill-switch payload: missing required fields';`  
 `end if;`

`v_scope := p->>'scope'; -- 'platform' | 'tenant'`  
 `v_reason := p->>'reason';`

`if v_reason is null or length(v_reason) < 5 then`  
 `raise exception 'Kill-switch reason required';`  
 `end if;`

`-- Mode validation`  
 `begin`  
 `v_mode := (p->>'mode')::public.platform_mode;`  
 `exception when others then`  
 `raise exception 'Invalid mode (must be normal|read_only|approval_only)';`  
 `end;`

`v_maker := (p->>'maker_id')::uuid;`  
 `v_checker := (p->>'checker_id')::uuid;`

`-- For platform scope: use maker org (event.org_id) as governance org to validate checker roles`  
 `-- For tenant scope: target org must be specified and also validated`  
 `if v_scope = 'platform' then`  
 `perform public.enforce_maker_checker_for_kill_switch(e.org_id, v_maker, v_checker);`

    `update public.control_plane_flags`
    `set mode = v_mode, updated_at = now(), updated_by = v_maker`
    `where key = 'PLATFORM_MODE';`

    `insert into public.kill_switch_applications (event_id, result_mode, scope, scope_org_id)`
    `values (p_event_id, v_mode, 'platform', null);`

    `-- Write KILL_SWITCH_APPLIED event (audit)`
    `insert into public.events (`
      `event_domain, event_type, org_id, actor_id, payload, schema_version, created_at, effective_at`
    `)`
    `values (`
      `'governance',`
      `'KILL_SWITCH_APPLIED',`
      `e.org_id,`
      `v_maker,`
      `jsonb_build_object(`
        `'schema_version', '1.0',`
        `'subject_id', p_event_id,`
        `'occurred_at', now(),`
        `'scope', 'platform',`
        `'mode', v_mode::text,`
        `'reason', v_reason,`
        `'maker_id', v_maker,`
        `'checker_id', v_checker`
      `),`
      `'1.0',`
      `now(),`
      `now()`
    `);`

    `return query select true, 'platform', v_mode, null::uuid;`
    `return;`

`elsif v_scope = 'tenant' then`  
 `if not (p ? 'target_org_id') then`  
 `raise exception 'Tenant scope requires target_org_id';`  
 `end if;`

    `v_target_org := (p->>'target_org_id')::uuid;`

    `-- Validate checker privileges in governance org (event.org_id)`
    `perform public.enforce_maker_checker_for_kill_switch(e.org_id, v_maker, v_checker);`

    `insert into public.tenant_flags (org_id, key, mode, updated_at, updated_by)`
    `values (v_target_org, 'TENANT_MODE', v_mode, now(), v_maker)`
    `on conflict (org_id, key)`
    `do update set mode = excluded.mode, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`

    `insert into public.kill_switch_applications (event_id, result_mode, scope, scope_org_id)`
    `values (p_event_id, v_mode, 'tenant', v_target_org);`

    `insert into public.events (`
      `event_domain, event_type, org_id, actor_id, payload, schema_version, created_at, effective_at`
    `)`
    `values (`
      `'governance',`
      `'KILL_SWITCH_APPLIED',`
      `e.org_id,`
      `v_maker,`
      `jsonb_build_object(`
        `'schema_version', '1.0',`
        `'subject_id', p_event_id,`
        `'occurred_at', now(),`
        `'scope', 'tenant',`
        `'target_org_id', v_target_org::text,`
        `'mode', v_mode::text,`
        `'reason', v_reason,`
        `'maker_id', v_maker,`
        `'checker_id', v_checker`
      `),`
      `'1.0',`
      `now(),`
      `now()`
    `);`

    `return query select true, 'tenant', v_mode, v_target_org;`
    `return;`

`else`  
 `raise exception 'Invalid scope (must be platform|tenant)';`  
 `end if;`

`end;`  
`$$;`

`-- Only service role should execute this. Do NOT grant to authenticated.`  
`revoke all on function public.apply_kill_switch_event(uuid) from authenticated;`

**Why this is disciplined**

- Kill-switch activation remains an **event** (auditable intent).

- Worker applies it **idempotently** and records application.

- RPCs enforce based on **flag tables**, not by guessing from events.

---

# **B) Edge Worker — Apply Kill-Switch Events (Service Role)**

Two options:

- **Manual trigger** endpoint (safe \+ deterministic)

- Optional scheduled cron calling it periodically

File: `supabase/functions/apply_kill_switches/index.ts`

`/// <reference lib="deno.ns" />`  
`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" },`  
 `});`  
`}`

`Deno.serve(async (req) => {`  
 `try {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

    `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
    `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
    `const svc = createClient(supabaseUrl, serviceKey);`

    `// Find unapplied kill-switch events`
    `const { data: events, error: evErr } = await svc`
      `.from("events")`
      `.select("id")`
      `.eq("event_domain", "governance")`
      `.eq("event_type", "KILL_SWITCH_ACTIVATED")`
      `.is("superseded_at", null)`
      `.order("created_at", { ascending: true })`
      `.limit(50);`

    `if (evErr) return jsonResponse({ error: evErr.message }, 500);`

    `const results: any[] = [];`
    `for (const e of events ?? []) {`
      `// Check if already applied (idempotency)`
      `const { data: appliedRow } = await svc`
        `.from("kill_switch_applications")`
        `.select("event_id")`
        `.eq("event_id", e.id)`
        `.maybeSingle();`

      `if (appliedRow) continue;`

      `// Apply via DB function`
      `const { data, error } = await svc.rpc("apply_kill_switch_event", { p_event_id: e.id });`

      `if (error) {`
        `results.push({ event_id: e.id, applied: false, error: error.message });`
      `} else {`
        `results.push({ event_id: e.id, applied: true, result: data });`
      `}`
    `}`

    `return jsonResponse({ ok: true, processed: results.length, results }, 200);`

`} catch (e) {`  
 `return jsonResponse({ error: "Unhandled error", details: String(e) }, 500);`  
 `}`  
`});`

---

# **C) Schema Pack Addition — `KILL_SWITCH_APPLIED`**

Add to shared schema pack:

### **`schemas/governance/KILL_SWITCH_APPLIED.v1.json`**

`{`  
 `"$id": "texqtic.governance.KILL_SWITCH_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "scope", "mode", "reason", "maker_id", "checker_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"scope": { "type": "string", "enum": ["platform", "tenant"] },`  
 `"target_org_id": { "type": "string", "format": "uuid" },`  
 `"mode": { "type": "string", "enum": ["normal", "read_only", "approval_only"] },`  
 `"reason": { "type": "string", "minLength": 5 },`  
 `"maker_id": { "type": "string", "format": "uuid" },`  
 `"checker_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

Add to `eventSchemas` registry (Next \+ Edge).

---

# **D) Governance Activation Flow (How to Use)**

1. Emit event (via `emit_event`):

- `event_type = KILL_SWITCH_ACTIVATED`

- `payload.scope = platform|tenant`

- if tenant: include `target_org_id`

- include `mode`, `reason`, `maker_id`, `checker_id`

2. Run worker:

- call `POST /functions/v1/apply_kill_switches` (service role only)

- or run it from admin console

3. Verify flags:

- platform: `control_plane_flags.PLATFORM_MODE`

- tenant: `tenant_flags(org_id,'TENANT_MODE')`

4. Verify enforcement:

- call transition RPC → should fail if read_only, require checker if approval_only

---

# **E) Tests (Must-Have)**

## **Unit-ish DB tests (service role)**

- Insert `KILL_SWITCH_ACTIVATED` event (valid payload)

- Call `apply_kill_switch_event(event_id)`

- Assert:
  - flags updated

  - `kill_switch_applications` row exists

  - `KILL_SWITCH_APPLIED` event exists

## **E2E enforcement tests**

- Set platform read_only using activation flow

- Attempt `transition_trade_state` → fails with kill-switch exception

- Emit `DOCTRINE_OVERRIDE` (maker-checker) for that action \+ subject

- Attempt transition again with checker_id → succeeds

---

# **Acceptance Criteria**

- Kill-switch activation is event-driven and maker–checker enforced

- Worker applies flags idempotently and records application

- `KILL_SWITCH_APPLIED` event is written for audit

- RPC guards reflect applied flags immediately

- Tests cover activation → applied → blocked → override → allowed

---

## **Next logical task (only one)**

**Next: add “Kill-Switch Deactivation \+ Sunset”** (`KILL_SWITCH_DEACTIVATED` event \+ applied worker \+ audit), so governance can safely return to `normal` and you keep symmetric controls.

# **Ticket — Kill-Switch Deactivation \+ Sunset (Event → Worker Apply → Audit)**

## **Goal**

Complete symmetric governance control:

**KILL_SWITCH_DEACTIVATED (event intent)**  
 → maker–checker enforced  
 → service-role worker applies mode back to `normal`  
 → writes `KILL_SWITCH_DEACTIVATED_APPLIED` audit event  
 → preserves full history \+ supports “sunset” (time-boxed switches that auto-expire)

This ensures kill-switches can be safely lifted with the same rigor as activation.

---

## **Deliverables**

1. Schema pack:

- `KILL_SWITCH_DEACTIVATED` (intent)

- `KILL_SWITCH_DEACTIVATED_APPLIED` (audit)

2. SQL:

- Extend `kill_switch_applications` to track active/inactive \+ sunset timestamps

- `public.apply_kill_switch_deactivation_event(p_event_id uuid)` (service-role only)

3. Worker:

- Update `apply_kill_switches` to process both ACTIVATED \+ DEACTIVATED

- Add optional “sunset enforcement” mode (auto-normalize expired switches)

4. Tests:

- deactivate platform read_only → returns to normal → RPCs allowed

- deactivate tenant approval_only → returns to normal

- invalid deactivation payload rejected

- maker==checker rejected

- deactivation idempotent

---

# **A) Schema Pack Additions**

## **1\) `KILL_SWITCH_DEACTIVATED` (intent)**

`{`  
 `"$id": "texqtic.governance.KILL_SWITCH_DEACTIVATED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "scope", "reason", "maker_id", "checker_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"scope": { "type": "string", "enum": ["platform", "tenant"] },`  
 `"target_org_id": { "type": "string", "format": "uuid" },`  
 `"reason": { "type": "string", "minLength": 5 },`  
 `"maker_id": { "type": "string", "format": "uuid" },`  
 `"checker_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

## **2\) `KILL_SWITCH_DEACTIVATED_APPLIED` (audit)**

`{`  
 `"$id": "texqtic.governance.KILL_SWITCH_DEACTIVATED_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "scope", "mode", "reason", "maker_id", "checker_id"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"scope": { "type": "string", "enum": ["platform", "tenant"] },`  
 `"target_org_id": { "type": "string", "format": "uuid" },`  
 `"mode": { "type": "string", "enum": ["normal"] },`  
 `"reason": { "type": "string", "minLength": 5 },`  
 `"maker_id": { "type": "string", "format": "uuid" },`  
 `"checker_id": { "type": "string", "format": "uuid" }`  
 `},`  
 `"additionalProperties": false`  
`}`

Add both to `eventSchemas` registry (shared schema pack) and bundle for Edge.

---

# **B) SQL — Extend `kill_switch_applications` for Active/Inactive \+ Sunset**

File: `supabase/migrations/050_kill_switch_applications_extend.sql`

`alter table public.kill_switch_applications`  
`add column if not exists status text not null default 'applied' check (status in ('applied','reverted','expired')),`  
`add column if not exists reverted_at timestamptz null,`  
`add column if not exists reverted_by text null,`  
`add column if not exists sunset_at timestamptz null;`

`-- Index for worker lookups`  
`create index if not exists kill_switch_status_idx`  
 `on public.kill_switch_applications (status, applied_at);`

`create index if not exists kill_switch_sunset_idx`  
 `on public.kill_switch_applications (sunset_at)`  
 `where sunset_at is not null;`

### **Optional: allow activation events to include `sunset_at`**

If you want sunsetting: add it to `KILL_SWITCH_ACTIVATED` schema and store it in `kill_switch_applications.sunset_at` when applying.

---

# **C) SQL — Apply Deactivation Function (Service Role)**

File: `supabase/migrations/051_kill_switch_deactivate_apply.sql`

`create or replace function public.apply_kill_switch_deactivation_event(p_event_id uuid)`  
`returns table (`  
 `applied boolean,`  
 `scope text,`  
 `mode public.platform_mode,`  
 `org_id uuid`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `e record;`  
 `p jsonb;`  
 `v_scope text;`  
 `v_target_org uuid;`  
 `v_maker uuid;`  
 `v_checker uuid;`  
 `v_reason text;`  
`begin`  
 `-- Idempotency: if already applied as a deactivation, return success.`  
 `if exists (`  
 `select 1 from public.kill_switch_applications`  
 `where event_id = p_event_id`  
 `) then`  
 `return query`  
 `select true, k.scope, 'normal'::public.platform_mode, k.scope_org_id`  
 `from public.kill_switch_applications k`  
 `where k.event_id = p_event_id;`  
 `return;`  
 `end if;`

`select * into e`  
 `from public.events`  
 `where id = p_event_id`  
 `and event_domain = 'governance'`  
 `and event_type = 'KILL_SWITCH_DEACTIVATED';`

`if not found then`  
 `raise exception 'Event not found or not KILL_SWITCH_DEACTIVATED';`  
 `end if;`

`p := e.payload;`

`if not (p ? 'scope' and p ? 'maker_id' and p ? 'checker_id' and p ? 'reason') then`  
 `raise exception 'Invalid kill-switch deactivation payload: missing required fields';`  
 `end if;`

`v_scope := p->>'scope';`  
 `v_reason := p->>'reason';`  
 `v_maker := (p->>'maker_id')::uuid;`  
 `v_checker := (p->>'checker_id')::uuid;`

`-- Reuse same maker-checker validator (checker privileges enforced in governance org = e.org_id)`  
 `perform public.enforce_maker_checker_for_kill_switch(e.org_id, v_maker, v_checker);`

`if v_scope = 'platform' then`  
 `update public.control_plane_flags`  
 `set mode = 'normal', updated_at = now(), updated_by = v_maker`  
 `where key = 'PLATFORM_MODE';`

    `insert into public.kill_switch_applications (event_id, result_mode, scope, scope_org_id, status, applied_by)`
    `values (p_event_id, 'normal', 'platform', null, 'applied', 'worker');`

    `insert into public.events (`
      `event_domain, event_type, org_id, actor_id, payload, schema_version, created_at, effective_at`
    `)`
    `values (`
      `'governance',`
      `'KILL_SWITCH_DEACTIVATED_APPLIED',`
      `e.org_id,`
      `v_maker,`
      `jsonb_build_object(`
        `'schema_version', '1.0',`
        `'subject_id', p_event_id,`
        `'occurred_at', now(),`
        `'scope', 'platform',`
        `'mode', 'normal',`
        `'reason', v_reason,`
        `'maker_id', v_maker,`
        `'checker_id', v_checker`
      `),`
      `'1.0',`
      `now(),`
      `now()`
    `);`

    `return query select true, 'platform', 'normal'::public.platform_mode, null::uuid;`
    `return;`

`elsif v_scope = 'tenant' then`  
 `if not (p ? 'target_org_id') then`  
 `raise exception 'Tenant scope requires target_org_id';`  
 `end if;`

    `v_target_org := (p->>'target_org_id')::uuid;`

    `insert into public.tenant_flags (org_id, key, mode, updated_at, updated_by)`
    `values (v_target_org, 'TENANT_MODE', 'normal', now(), v_maker)`
    `on conflict (org_id, key)`
    `do update set mode = excluded.mode, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`

    `insert into public.kill_switch_applications (event_id, result_mode, scope, scope_org_id, status, applied_by)`
    `values (p_event_id, 'normal', 'tenant', v_target_org, 'applied', 'worker');`

    `insert into public.events (`
      `event_domain, event_type, org_id, actor_id, payload, schema_version, created_at, effective_at`
    `)`
    `values (`
      `'governance',`
      `'KILL_SWITCH_DEACTIVATED_APPLIED',`
      `e.org_id,`
      `v_maker,`
      `jsonb_build_object(`
        `'schema_version', '1.0',`
        `'subject_id', p_event_id,`
        `'occurred_at', now(),`
        `'scope', 'tenant',`
        `'target_org_id', v_target_org::text,`
        `'mode', 'normal',`
        `'reason', v_reason,`
        `'maker_id', v_maker,`
        `'checker_id', v_checker`
      `),`
      `'1.0',`
      `now(),`
      `now()`
    `);`

    `return query select true, 'tenant', 'normal'::public.platform_mode, v_target_org;`
    `return;`

`else`  
 `raise exception 'Invalid scope (must be platform|tenant)';`  
 `end if;`  
`end;`  
`$$;`

`revoke all on function public.apply_kill_switch_deactivation_event(uuid) from authenticated;`

---

# **D) Worker Update — Apply Activations \+ Deactivations \+ Sunset**

Update `apply_kill_switches` to process:

- `KILL_SWITCH_ACTIVATED` via `apply_kill_switch_event`

- `KILL_SWITCH_DEACTIVATED` via `apply_kill_switch_deactivation_event`

- Optional: enforce `sunset_at` expirations (auto-normalize)

File: `supabase/functions/apply_kill_switches/index.ts` (patch)

`// After fetching events, process both types:`  
`const types = ["KILL_SWITCH_ACTIVATED", "KILL_SWITCH_DEACTIVATED"];`

`const { data: events, error: evErr } = await svc`  
 `.from("events")`  
 `.select("id,event_type")`  
 `.eq("event_domain", "governance")`  
 `.in("event_type", types)`  
 `.is("superseded_at", null)`  
 `.order("created_at", { ascending: true })`  
 `.limit(100);`

`// For each event, call the right RPC:`  
`if (e.event_type === "KILL_SWITCH_ACTIVATED") {`  
 `await svc.rpc("apply_kill_switch_event", { p_event_id: e.id });`  
`} else {`  
 `await svc.rpc("apply_kill_switch_deactivation_event", { p_event_id: e.id });`  
`}`

### **Optional: “Sunset enforcement”**

Add a worker pass that finds active applications with `sunset_at < now()` and flips flags back to normal, writing a `KILL_SWITCH_EXPIRED_APPLIED` event. (We can ticket that separately to avoid scope creep.)

---

# **E) Tests**

## **Test 1 — Platform deactivation restores normal ops**

1. Activate platform read_only (existing path) \+ apply

2. Assert trade RPC is blocked

3. Emit `KILL_SWITCH_DEACTIVATED` scope=platform \+ maker/checker \+ apply worker

4. Assert `control_plane_flags.PLATFORM_MODE = normal`

5. Assert trade RPC allowed again (assuming prerequisites satisfied)

## **Test 2 — Tenant deactivation restores tenant**

1. Activate tenant approval_only \+ apply

2. Assert RPC without checker blocked

3. Deactivate tenant \+ apply

4. Assert tenant flag normal

5. Assert RPC without checker proceeds (subject to prerequisites)

## **Test 3 — Maker–checker enforced**

- maker==checker on deactivation intent → `emit_event` should reject (Edge), or apply RPC rejects if event slipped in.

## **Test 4 — Idempotency**

- applying the same deactivation event twice does not duplicate flag changes or application rows.

---

# **Acceptance Criteria**

- `KILL_SWITCH_DEACTIVATED` intent is validated \+ maker–checker required

- Worker applies deactivation to flags and writes audit event

- After deactivation, RPC guards permit transitions again

- End-to-end tests prove: activate → blocked → deactivate → unblocked

- Idempotent and auditable behavior (no duplicates)

---

## **Next logical task (only one)**

**Next: “Kill-Switch Sunset & Expiry Enforcement”** — add `sunset_at` to activation events and implement automatic expiry that returns modes to `normal` with a dedicated `KILL_SWITCH_EXPIRED_APPLIED` audit event.

# **Ticket — Kill-Switch Sunset & Expiry Enforcement (sunset_at → auto-normalize → audit)**

## **Goal**

Enable **time-boxed kill-switches** so governance can say:

“Set tenant to approval_only for 6 hours”  
 …and the system **automatically returns to normal** when the sunset expires, with a permanent audit trail.

This implements:

- `sunset_at` on `KILL_SWITCH_ACTIVATED`

- Worker enforcement that:
  - marks expired applications

  - sets flags back to `normal`

  - writes `KILL_SWITCH_EXPIRED_APPLIED` event

---

## **Deliverables**

1. Schema pack updates:

- Add optional `sunset_at` to `KILL_SWITCH_ACTIVATED`

- New event schema: `KILL_SWITCH_EXPIRED_APPLIED`

2. SQL:

- Extend apply function to persist sunset_at into `kill_switch_applications`

- New SQL function: `public.expire_kill_switches()` (service role)

3. Worker:

- `apply_kill_switches` runs `expire_kill_switches()` after applying events

4. Tests:

- activation with sunset_at expires correctly

- flags revert to normal

- audit event exists

- idempotent expiry

---

# **A) Schema Pack Updates**

## **1\) Update `KILL_SWITCH_ACTIVATED` to include `sunset_at` (optional)**

Add to the schema:

`"sunset_at": { "type": "string", "format": "date-time" }`

And allow it in properties (do not require it).  
 Rule: if present, `sunset_at > occurred_at`.

### **Suggested validation rule (Ajv custom or app-side)**

- `sunset_at` must be in the future at activation time (optional but recommended)

## **2\) New event: `KILL_SWITCH_EXPIRED_APPLIED`**

`{`  
 `"$id": "texqtic.governance.KILL_SWITCH_EXPIRED_APPLIED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version", "subject_id", "occurred_at", "scope", "mode", "sunset_at", "reason"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"scope": { "type": "string", "enum": ["platform", "tenant"] },`  
 `"target_org_id": { "type": "string", "format": "uuid" },`  
 `"mode": { "type": "string", "enum": ["normal"] },`  
 `"sunset_at": { "type": "string", "format": "date-time" },`  
 `"reason": { "type": "string", "minLength": 5 }`  
 `},`  
 `"additionalProperties": false`  
`}`

Interpretation: this audit event’s `subject_id` is the **activation event_id** that expired.

---

# **B) SQL — Persist sunset_at when applying activation**

Patch `apply_kill_switch_event(p_event_id uuid)` so it stores sunset_at:

Inside activation apply logic, after reading payload `p := e.payload;`:

`-- optional sunset`  
`-- if present, store in kill_switch_applications.sunset_at`

When inserting into `kill_switch_applications`, add:

`sunset_at = case when (p ? 'sunset_at') then (p->>'sunset_at')::timestamptz else null end`

File: `supabase/migrations/060_kill_switch_sunset_store.sql`  
 (Implement as create/replace for apply function.)

---

# **C) SQL — Expiry Function (Service Role)**

## **`public.expire_kill_switches()`**

This function:

- finds kill_switch_applications with `status='applied'` and `sunset_at <= now()`

- sets corresponding flag back to `normal`

- marks application `status='expired'`

- writes `KILL_SWITCH_EXPIRED_APPLIED`

File: `supabase/migrations/061_kill_switch_expiry_fn.sql`

`create or replace function public.expire_kill_switches()`  
`returns table (`  
 `expired_count int`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `r record;`  
 `v_count int := 0;`  
`begin`  
 `for r in`  
 `select *`  
 `from public.kill_switch_applications`  
 `where status = 'applied'`  
 `and sunset_at is not null`  
 `and sunset_at <= now()`  
 `order by sunset_at asc`  
 `limit 100`  
 `loop`  
 `-- Revert flags to normal`  
 `if r.scope = 'platform' then`  
 `update public.control_plane_flags`  
 `set mode = 'normal', updated_at = now()`  
 `where key = 'PLATFORM_MODE';`

      `-- Write audit event (org_id unknown here; use governance org? We can safely set org_id to NULL? but org_id is NOT NULL in events.`
      `-- Use a system org: recommended to store a "GOVERNANCE_ORG_ID" in control_plane_flags or env.`
      `-- Minimal approach: store governance org id in control_plane_flags as GOVERNANCE_ORG_ID key.`
    `elsif r.scope = 'tenant' then`
      `insert into public.tenant_flags (org_id, key, mode, updated_at)`
      `values (r.scope_org_id, 'TENANT_MODE', 'normal', now())`
      `on conflict (org_id, key)`
      `do update set mode = excluded.mode, updated_at = excluded.updated_at;`
    `else`
      `raise exception 'Unknown scope in kill_switch_applications';`
    `end if;`

    `-- Mark expired`
    `update public.kill_switch_applications`
    `set status = 'expired'`
    `where event_id = r.event_id;`

    `-- Emit audit event: KILL_SWITCH_EXPIRED_APPLIED`
    `-- Requires a governance org_id (not null constraint).`
    `-- Recommended: store in control_plane_flags as key='GOVERNANCE_ORG_ID' mode ignored.`
    `insert into public.events (`
      `event_domain, event_type, org_id, actor_id, payload, schema_version, created_at, effective_at`
    `)`
    `values (`
      `'governance',`
      `'KILL_SWITCH_EXPIRED_APPLIED',`
      `(select (payload->>'governance_org_id')::uuid`
         `from public.events`
        `where id = r.event_id`
        `limit 1`
      `),`
      `(select updated_by from public.control_plane_flags where key='PLATFORM_MODE'),`
      `jsonb_build_object(`
        `'schema_version', '1.0',`
        `'subject_id', r.event_id,`
        `'occurred_at', now(),`
        `'scope', r.scope,`
        `'target_org_id', case when r.scope_org_id is null then null else r.scope_org_id::text end,`
        `'mode', 'normal',`
        `'sunset_at', r.sunset_at,`
        `'reason', 'sunset_expired'`
      `),`
      `'1.0',`
      `now(),`
      `now()`
    `);`

    `v_count := v_count + 1;`

`end loop;`

`return query select v_count;`  
`end;`  
`$$;`

`revoke all on function public.expire_kill_switches() from authenticated;`

### **Critical note (events.org_id NOT NULL)**

You need a deterministic org_id for audit events written by the worker.

**Clean solution (recommended):**

- Add a dedicated `SYSTEM_GOVERNANCE_ORG_ID` constant stored in DB (one row), or an env var used by the worker to write events using service role.

Simplest implementation (no DB hack):

- **Do NOT insert the audit event in SQL.**

- Instead, return the expired items list and have the Edge worker write `KILL_SWITCH_EXPIRED_APPLIED` via service role with a known governance org_id.

To keep this ticket focused and correct, I recommend the **worker writes the audit events**.

So: modify expiry function to _only revert flags \+ mark expired \+ return list of expired event_ids_, and Edge worker writes the audit events.

---

# **D) Revised SQL Expiry Function (Preferred)**

File: `supabase/migrations/061_kill_switch_expiry_fn.sql` (preferred)

`create or replace function public.expire_kill_switches()`  
`returns table (`  
 `event_id uuid,`  
 `scope text,`  
 `scope_org_id uuid,`  
 `sunset_at timestamptz`  
`)`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `r record;`  
`begin`  
 `for r in`  
 `select event_id, scope, scope_org_id, sunset_at`  
 `from public.kill_switch_applications`  
 `where status = 'applied'`  
 `and sunset_at is not null`  
 `and sunset_at <= now()`  
 `order by sunset_at asc`  
 `limit 100`  
 `loop`  
 `if r.scope = 'platform' then`  
 `update public.control_plane_flags`  
 `set mode = 'normal', updated_at = now()`  
 `where key = 'PLATFORM_MODE';`  
 `elsif r.scope = 'tenant' then`  
 `insert into public.tenant_flags (org_id, key, mode, updated_at)`  
 `values (r.scope_org_id, 'TENANT_MODE', 'normal', now())`  
 `on conflict (org_id, key)`  
 `do update set mode = excluded.mode, updated_at = excluded.updated_at;`  
 `end if;`

    `update public.kill_switch_applications`
    `set status = 'expired'`
    `where event_id = r.event_id;`

    `return query select r.event_id, r.scope, r.scope_org_id, r.sunset_at;`

`end loop;`  
`end;`  
`$$;`

`revoke all on function public.expire_kill_switches() from authenticated;`

---

# **E) Worker Update — Expire then Write Audit Events**

Update `apply_kill_switches` worker to call `expire_kill_switches()` and write audit events.

Patch: `supabase/functions/apply_kill_switches/index.ts`

Add env var:

- `GOVERNANCE_ORG_ID` (uuid)

After applying events, add:

`const governanceOrgId = Deno.env.get("GOVERNANCE_ORG_ID");`  
`if (!governanceOrgId) {`  
 `return jsonResponse({ error: "Missing GOVERNANCE_ORG_ID secret" }, 500);`  
`}`

`const { data: expired, error: expErr } = await svc.rpc("expire_kill_switches");`  
`if (expErr) {`  
 `results.push({ expiry: { ok: false, error: expErr.message } });`  
`} else {`  
 `for (const x of expired ?? []) {`  
 `await svc.from("events").insert({`  
 `event_domain: "governance",`  
 `event_type: "KILL_SWITCH_EXPIRED_APPLIED",`  
 `org_id: governanceOrgId,`  
 `actor_id: null, // or a system user id if you have one; otherwise store in payload`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: x.event_id,`  
 `occurred_at: new Date().toISOString(),`  
 `scope: x.scope,`  
 `target_org_id: x.scope_org_id ?? undefined,`  
 `mode: "normal",`  
 `sunset_at: new Date(x.sunset_at).toISOString(),`  
 `reason: "sunset_expired"`  
 `},`  
 `schema_version: "1.0",`  
 `reasoning_hash: null`  
 `});`  
 `}`  
 `results.push({ expiry: { ok: true, expired_count: expired?.length ?? 0 } });`  
`}`

**Note about actor_id NOT NULL constraint**  
 Your `events` table currently has `actor_id uuid NOT NULL`.  
 So for system-written events, you need a consistent “system actor.”

**Recommended fix (small \+ clean):**

- Create a `system_users` / “Control Plane Service User” and store its UUID in secret `SYSTEM_ACTOR_ID`.

- Worker uses that for `actor_id`.

Add secret:

- `SYSTEM_ACTOR_ID=<uuid>`

Then set `actor_id: SYSTEM_ACTOR_ID`.

---

# **F) Tests**

## **Test 1 — Tenant kill-switch expires**

1. Emit `KILL_SWITCH_ACTIVATED` with:
   - scope=tenant, target_org_id

   - mode=approval_only

   - sunset_at \= now \+ 2 seconds

2. Apply activation worker

3. Assert tenant flag is `approval_only`

4. Wait 3 seconds (test env only)

5. Call worker again

6. Assert tenant flag reverted to `normal`

7. Assert `kill_switch_applications.status='expired'`

8. Assert audit event `KILL_SWITCH_EXPIRED_APPLIED` exists

## **Test 2 — Platform kill-switch expires**

Same as above but scope=platform; verify `control_plane_flags.PLATFORM_MODE = normal`.

## **Test 3 — Idempotency**

Run worker repeatedly; expired entries should not re-expire or duplicate audit events.

---

# **Acceptance Criteria**

- `sunset_at` stored when applying activation

- Expired kill-switches auto-revert to normal (platform \+ tenant)

- `KILL_SWITCH_EXPIRED_APPLIED` audit event written once per expiry

- System actor used consistently (SYSTEM_ACTOR_ID)

- E2E tests pass and show enforcement before expiry \+ normal after expiry

---

## **Next logical task (only one)**

**Next: “Cross-Domain Kill-Switch Scopes”** — extend kill-switch payload to target domains (`trade`, `compliance`, `ai`) and have guards check domain-specific flags (e.g., AI frozen while trade continues).

# **Ticket — Cross-Domain Kill-Switch Scopes (trade / compliance / ai) \+ Domain-Aware Guards**

## **Goal**

Extend kill-switches from a single global mode into **domain-scoped controls** so governance can freeze:

- **AI only** (AI automation stops; trade continues)

- **Trade only** (transactions frozen; compliance data still readable)

- **Compliance only** (cert acceptance frozen; trade continues with warnings)

This is Doctrine v1.2 implemented as enforceable primitives.

---

## **Design (Minimal, Scalable)**

We introduce a `domain` field to kill-switch intent events and flag tables.

### **Domain options**

- `platform` (existing global)

- `trade`

- `compliance`

- `ai`

### **Modes (unchanged)**

- `normal`

- `read_only`

- `approval_only`

### **Resolution rule (deterministic)**

Effective mode for an action is the **max severity** across:

1. platform-level mode (global)

2. tenant-level mode (org global)

3. domain mode (platform domain)

4. tenant domain mode (org domain)

Severity order:  
 `normal < approval_only < read_only`

---

## **Deliverables**

1. Schema pack updates:

- Add `domain` to:
  - `KILL_SWITCH_ACTIVATED`

  - `KILL_SWITCH_DEACTIVATED`

  - `KILL_SWITCH_APPLIED`

  - `KILL_SWITCH_DEACTIVATED_APPLIED`

  - `KILL_SWITCH_EXPIRED_APPLIED`

2. SQL changes:

- Add domain-aware keys in flag tables

- Add `effective_mode(org_id, domain)` \+ upgraded `require_not_frozen(action, subject, org, actor, checker, domain)`

3. Apply functions:

- Activation/deactivation store domain \+ apply correct flag row

4. RPC hardening:

- Pass domain into guard for each RPC:
  - trade RPCs → domain=`trade`

  - escrow \+ settlement → domain=`trade`

  - emit_event for AI automation events → domain=`ai` (guarded at Edge)

5. Tests:

- Freeze AI only: AI events rejected, trade RPC succeeds

- Freeze trade only: trade RPC rejected, compliance event accepted

- Tenant+domain precedence works (max severity)

---

# **A) Schema Pack Updates (add `domain`)**

Update kill-switch schemas: add a required `domain` field:

`"domain": { "type": "string", "enum": ["platform", "trade", "compliance", "ai"] }`

### **Notes**

- `domain="platform"` means “global platform mode”

- Domain-specific kill-switches use `domain="trade"` etc.

- For tenant scope \+ domain, you can freeze “AI only for Org X”.

---

# **B) SQL — Domain-Aware Flags**

## **1\) Update flag tables to support domain keys**

Use a consistent key scheme:

- `control_plane_flags.key`:
  - `PLATFORM_MODE` (legacy global)

  - `DOMAIN_MODE:trade`

  - `DOMAIN_MODE:compliance`

  - `DOMAIN_MODE:ai`

- `tenant_flags.key`:
  - `TENANT_MODE` (legacy org global)

  - `TENANT_DOMAIN_MODE:trade`

  - `TENANT_DOMAIN_MODE:compliance`

  - `TENANT_DOMAIN_MODE:ai`

File: `supabase/migrations/070_domain_flags.sql`

`-- Seed platform domain rows`  
`insert into public.control_plane_flags (key, mode)`  
`values`  
 `('DOMAIN_MODE:trade', 'normal'),`  
 `('DOMAIN_MODE:compliance', 'normal'),`  
 `('DOMAIN_MODE:ai', 'normal')`  
`on conflict (key) do nothing;`

---

# **C) SQL — Effective Mode Resolver (max severity)**

File: `supabase/migrations/071_effective_mode.sql`

`create or replace function public.mode_severity(p_mode public.platform_mode)`  
`returns int`  
`language sql`  
`immutable`  
`as $$`  
 `select case p_mode`  
 `when 'normal' then 0`  
 `when 'approval_only' then 1`  
 `when 'read_only' then 2`  
 `end`  
`$$;`

`create or replace function public.max_mode(a public.platform_mode, b public.platform_mode)`  
`returns public.platform_mode`  
`language sql`  
`immutable`  
`as $$`  
 `select case`  
 `when public.mode_severity(a) >= public.mode_severity(b) then a else b`  
 `end`  
`$$;`

`create or replace function public.get_platform_domain_mode(p_domain text)`  
`returns public.platform_mode`  
`language sql`  
`stable`  
`as $$`  
 `select coalesce(`  
 `(select mode from public.control_plane_flags where key = ('DOMAIN_MODE:' || p_domain)),`  
 `'normal'::public.platform_mode`  
 `)`  
`$$;`

`create or replace function public.get_tenant_domain_mode(p_org_id uuid, p_domain text)`  
`returns public.platform_mode`  
`language sql`  
`stable`  
`as $$`  
 `select coalesce(`  
 `(select mode from public.tenant_flags where org_id = p_org_id and key = ('TENANT_DOMAIN_MODE:' || p_domain)),`  
 `'normal'::public.platform_mode`  
 `)`  
`$$;`

`create or replace function public.effective_mode(p_org_id uuid, p_domain text)`  
`returns public.platform_mode`  
`language sql`  
`stable`  
`as $$`  
 `select`  
 `public.max_mode(`  
 `public.max_mode(`  
 `public.max_mode(`  
 `(select mode from public.control_plane_flags where key='PLATFORM_MODE'),`  
 `public.get_platform_domain_mode(p_domain)`  
 `),`  
 `public.get_tenant_mode(p_org_id)`  
 `),`  
 `public.get_tenant_domain_mode(p_org_id, p_domain)`  
 `)`  
`$$;`

---

# **D) SQL — Upgrade Guard to Domain-Aware**

Replace/extend `require_not_frozen`:

File: `supabase/migrations/072_require_not_frozen_domain.sql`

`create or replace function public.require_not_frozen(`  
 `p_action text,`  
 `p_subject_id uuid,`  
 `p_org_id uuid,`  
 `p_actor_id uuid,`  
 `p_checker_id uuid default null,`  
 `p_domain text default 'platform'`  
`) returns void`  
`language plpgsql`  
`stable`  
`as $$`  
`declare`  
 `v_mode public.platform_mode;`  
`begin`  
 `v_mode := public.effective_mode(p_org_id, p_domain);`

`if v_mode = 'read_only' then`  
 `if p_checker_id is not null`  
 `and public.has_doctrine_override(p_action, p_subject_id, p_org_id, p_actor_id, p_checker_id)`  
 `then`  
 `return;`  
 `end if;`  
 `raise exception 'Kill-Switch: % read_only blocks action %', p_domain, p_action;`  
 `end if;`

`if v_mode = 'approval_only' then`  
 `if p_checker_id is null then`  
 `raise exception 'Kill-Switch: % approval_only requires checker for action %', p_domain, p_action;`  
 `end if;`  
 `end if;`

`return;`  
`end;`  
`$$;`

---

# **E) Apply Functions — Use domain to choose correct flag row**

## **Activation apply changes**

In `apply_kill_switch_event`, read:

- `domain` from payload

- `scope` (platform|tenant)

- apply to one of:
  - platform \+ domain=platform → `control_plane_flags.PLATFORM_MODE`

  - platform \+ domain\!=platform → `control_plane_flags.DOMAIN_MODE:<domain>`

  - tenant \+ domain=platform → `tenant_flags.TENANT_MODE`

  - tenant \+ domain\!=platform → `tenant_flags.TENANT_DOMAIN_MODE:<domain>`

Same for deactivation and expiry.

**Key mapping function (recommended)**  
 Add helper:

`create or replace function public.flag_key_for(p_scope text, p_domain text)`  
`returns text`  
`language sql`  
`immutable`  
`as $$`  
 `select case`  
 `when p_scope='platform' and p_domain='platform' then 'PLATFORM_MODE'`  
 `when p_scope='platform' then 'DOMAIN_MODE:' || p_domain`  
 `when p_scope='tenant' and p_domain='platform' then 'TENANT_MODE'`  
 `else 'TENANT_DOMAIN_MODE:' || p_domain`  
 `end`  
`$$;`

Then use it to update/insert the appropriate row.

---

# **F) RPC Hardening — Pass domain**

Update the guard calls:

- `transition_trade_state`:

`perform public.require_not_frozen('transition_trade_state', p_trade_id, v_org_id, v_actor, p_checker_id, 'trade');`

- `transition_escrow_state`:

`perform public.require_not_frozen('transition_escrow_state', p_trade_id, v_org_id, v_actor, p_checker_id, 'trade');`

- `orchestrate_settlement`:

`perform public.require_not_frozen('orchestrate_settlement', p_trade_id, v_org_id, v_actor, p_checker_id, 'trade');`

### **AI enforcement (important)**

For AI, enforce at Edge `emit_event` for AI automation events:

- For event_types: `AI_DECISION_APPLIED`, `AI_RISK_SCORED`, `AI_DRIFT_DETECTED`

- Determine org_id, actor_id

- Call a small RPC `require_not_frozen` via service role? (or embed into an AI-specific RPC path)  
   Simplest: add a DB RPC `guard_ai_event(subject_id)` that calls `require_not_frozen(..., domain='ai')`.

---

# **G) Tests**

## **Test 1 — AI frozen, trade continues**

1. Activate kill-switch: scope=platform, domain=ai, mode=read_only

2. Apply worker

3. Try emitting `AI_DECISION_APPLIED` → must fail (422)

4. Trade RPC `transition_trade_state` (with prerequisites) → succeeds

## **Test 2 — Trade frozen, compliance continues**

1. Activate: scope=platform, domain=trade, mode=read_only

2. Apply worker

3. `transition_trade_state` → fails

4. Emit `CERTIFICATION_VERIFIED` → succeeds

## **Test 3 — Tenant AI approval_only**

1. Activate: scope=tenant, target_org_id, domain=ai, mode=approval_only

2. Apply worker

3. AI event without checker (or without override if you choose) fails

## **Test 4 — Precedence (max severity)**

- platform normal

- tenant normal

- platform domain trade approval_only

- tenant domain trade read_only  
   → effective mode \= read_only

---

# **Acceptance Criteria**

- Kill-switch events include `domain`

- Worker applies domain-specific flags correctly

- `effective_mode` resolves max severity deterministically

- Trade RPCs use domain=trade guard

- AI event path is guarded by domain=ai

- Tests demonstrate AI-only freeze and trade-only freeze behavior

---

## **Next logical task (only one)**

**Next: “Domain-Aware Kill-Switch UI & Governance Console”** — a minimal admin screen to activate/deactivate/sunset per (scope, domain) with maker–checker workflow and live status display from flag tables \+ latest applied events.

# **Ticket — Domain-Aware Kill-Switch UI & Governance Console (Minimal, Production-Discipline)**

## **Goal**

Create a minimal governance console that lets authorized operators:

1. **View live status** (platform \+ domain \+ tenant \+ domain) from flag tables

2. **Activate / Deactivate** kill-switches with **maker–checker** workflow

3. Set **sunset_at** for time-boxed freezes

4. See **recent governance events** (Activated / Applied / Deactivated / Expired) for audit confidence

5. Never bypass doctrine: UI only emits events; worker applies; RPCs enforce.

---

## **Deliverables**

- Next.js route: `/admin/governance/kill-switches`

- Components:
  - `KillSwitchStatusPanel`

  - `KillSwitchRequestForm`

  - `PendingApprovalsQueue`

  - `RecentEventsTable`

- Client SDK:
  - `requestKillSwitchActivation(...)` (emits `KILL_SWITCH_ACTIVATED`)

  - `requestKillSwitchDeactivation(...)` (emits `KILL_SWITCH_DEACTIVATED`)

  - `requestCheckerApproval(...)` (emits `CHECKER_APPROVAL`)

  - `applyKillSwitchesNow()` (admin-only trigger to worker, optional)

- RLS \+ RBAC:
  - only governance roles can access page and write governance events

---

## **UX Model (Maker–Checker without complexity)**

### **Flow A — Activation**

1. Maker fills form → clicks **Request Activation**

2. System creates **KILL_SWITCH_ACTIVATED** event **(draft intent)** OR creates a “pending request” record

3. Checker opens queue → reviews → clicks **Approve**

4. System emits **CHECKER_APPROVAL** event

5. System emits final **KILL_SWITCH_ACTIVATED** event including maker_id \+ checker_id

6. Worker applies → `KILL_SWITCH_APPLIED` appears in Recent Events \+ flag changes

### **Flow B — Deactivation**

Same flow using `KILL_SWITCH_DEACTIVATED` \+ `KILL_SWITCH_DEACTIVATED_APPLIED`

Discipline rule: **Only the final kill-switch intent event** includes maker_id \+ checker_id and is accepted by worker.

---

## **Data Sources (Read-only)**

### **Live Modes**

- `control_plane_flags`:
  - `PLATFORM_MODE`

  - `DOMAIN_MODE:trade | compliance | ai`

- `tenant_flags`:
  - `TENANT_MODE`

  - `TENANT_DOMAIN_MODE:trade | compliance | ai`

### **Events Timeline**

From `events` where:

- `event_domain='governance'`

- `event_type IN (KILL_SWITCH_ACTIVATED, KILL_SWITCH_APPLIED, KILL_SWITCH_DEACTIVATED, KILL_SWITCH_DEACTIVATED_APPLIED, KILL_SWITCH_EXPIRED_APPLIED, CHECKER_APPROVAL)`  
   Order by `created_at DESC`

---

## **RBAC & RLS Requirements**

### **Who can access the console**

Only users with org role in governance org:

- `DOCTRINE_COUNCIL`

- `RISK_COMPLIANCE_AUTHORITY`

- `SYSTEM_INTEGRITY`

### **Who can emit governance events**

Same roles (Maker) can emit:

- `CHECKER_APPROVAL`

- `KILL_SWITCH_ACTIVATED`

- `KILL_SWITCH_DEACTIVATED`

### **Checker enforcement**

- UI prevents Maker from acting as Checker

- Edge/DB enforce maker \!= checker (already in worker/RPC enforcement)

---

## **Implementation Plan**

# **A) Backend: minimal endpoints / SDK calls**

## **1\) Use existing `emit_event` Edge function**

UI uses client SDK wrapper `emitEvent(eventType, payload, { reasoningHash? })`.

### **Event payload templates**

#### **`CHECKER_APPROVAL`**

`{`  
 `schema_version: "1.0",`  
 `subject_id: "<request_id_or_event_id>",`  
 `occurred_at: new Date().toISOString(),`  
 `maker_id: "<maker_user_id>",`  
 `checker_id: "<checker_user_id>",`  
 `action: "KILL_SWITCH_ACTIVATED" | "KILL_SWITCH_DEACTIVATED"`  
`}`

#### **`KILL_SWITCH_ACTIVATED`**

`{`  
 `schema_version: "1.0",`  
 `subject_id: "<uuid>",             // can be request_id`  
 `occurred_at: ISO,`  
 `scope: "platform" | "tenant",`  
 `domain: "platform" | "trade" | "compliance" | "ai",`  
 `target_org_id?: "<uuid>",         // required if scope=tenant`  
 `mode: "read_only" | "approval_only",`  
 `reason: "...",`  
 `maker_id: "<maker_user_id>",`  
 `checker_id: "<checker_user_id>",`  
 `sunset_at?: ISO`  
`}`

#### **`KILL_SWITCH_DEACTIVATED`**

Same but no `mode`, and optional target_org_id if tenant scope.

## **2\) Optional: “Apply now” button**

A button triggers the service-role worker endpoint:

- `POST /functions/v1/apply_kill_switches`

This is useful while you don’t have cron.

---

# **B) Frontend: `/admin/governance/kill-switches`**

## **Layout (single page, clean \+ minimal)**

1. **Status Panel** (read-only)
   - Platform: `PLATFORM_MODE`

   - Domains: trade / compliance / ai modes

   - Optional: Tenant lookup input \+ show its modes

2. **Request Form**
   - Action: Activate / Deactivate

   - Scope: Platform / Tenant

   - Domain: Platform / Trade / Compliance / AI

   - Mode (activate only): read_only / approval_only

   - Target org (tenant only): org picker (uuid \+ name)

   - Sunset (optional): datetime

   - Reason: required text

   - Submit: creates “Pending Request”

3. **Pending Approvals Queue**
   - shows pending requests created by others

   - checker can approve

4. **Recent Events Table**
   - shows last 50 governance events with timestamps, scope/domain/mode/target org, maker/checker

---

# **C) Pending Queue (Minimal storage)**

To avoid building a complex workflow engine, create a tiny table:

### **`kill_switch_requests`**

- id uuid

- action enum: activate | deactivate

- scope, domain, mode, target_org_id, sunset_at, reason

- maker_id

- status: pending | approved | rejected | applied

- created_at

Checker approval updates request status to `approved`, then UI emits the final kill-switch event with maker_id \+ checker_id.

This table is not “truth”; it is **workflow convenience** only.

**RLS**:

- Governance roles can read all

- Maker can see their own

- Only checker can mark approved/rejected

---

## **SQL for requests table (copy/paste)**

File: `supabase/migrations/080_kill_switch_requests.sql`

`do $$ begin`  
 `create type public.kill_switch_action as enum ('activate','deactivate');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.request_status as enum ('pending','approved','rejected','applied');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.kill_switch_requests (`  
 `id uuid primary key default gen_random_uuid(),`  
 `action public.kill_switch_action not null,`  
 `scope text not null check (scope in ('platform','tenant')),`  
 `domain text not null check (domain in ('platform','trade','compliance','ai')),`  
 `mode public.platform_mode null, -- only for activate`  
 `target_org_id uuid null references public.organizations(id),`  
 `sunset_at timestamptz null,`  
 `reason text not null,`  
 `maker_id uuid not null references auth.users(id),`  
 `checker_id uuid null references auth.users(id),`  
 `status public.request_status not null default 'pending',`  
 `created_at timestamptz not null default now(),`  
 `approved_at timestamptz null,`  
 `applied_at timestamptz null`  
`);`

`alter table public.kill_switch_requests enable row level security;`

`-- Governance roles check helper (reuse existing org_roles)`  
`create or replace function public.is_governance_user()`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select exists (`  
 `select 1 from public.org_roles r`  
 `where r.org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `and r.user_id = auth.uid()`  
 `and r.role in ('DOCTRINE_COUNCIL','RISK_COMPLIANCE_AUTHORITY','SYSTEM_INTEGRITY')`  
 `)`  
`$$;`

`create policy "ksr_read_governance"`  
`on public.kill_switch_requests`  
`for select`  
`to authenticated`  
`using (public.is_governance_user() or maker_id = auth.uid());`

`create policy "ksr_insert_governance"`  
`on public.kill_switch_requests`  
`for insert`  
`to authenticated`  
`with check (public.is_governance_user() and maker_id = auth.uid());`

`create policy "ksr_update_approve"`  
`on public.kill_switch_requests`  
`for update`  
`to authenticated`  
`using (public.is_governance_user())`  
`with check (public.is_governance_user());`

---

# **D) UI Logic (Checker Approve → Emit Events)**

When checker clicks **Approve**:

1. Update request row:
   - status=approved, checker_id set, approved_at=now

2. Emit `CHECKER_APPROVAL` (subject_id=request_id, maker_id, checker_id, action)

3. Emit final intent event:
   - `KILL_SWITCH_ACTIVATED` or `KILL_SWITCH_DEACTIVATED`

   - `subject_id=request_id` (so it links cleanly)

   - includes maker_id \+ checker_id, scope/domain, etc.

4. Optionally call “Apply now” to run worker

5. Mark request `status=applied` when `KILL_SWITCH_APPLIED` appears (poll events briefly) OR leave as approved (simple)

---

# **E) Tests / Acceptance Criteria**

## **Acceptance Criteria**

- Only governance roles can access the page

- Maker can submit activation/deactivation requests

- Checker can approve requests; maker cannot self-approve

- Approved request emits CHECKER_APPROVAL \+ KILL_SWITCH\_\* event

- Worker applies; flags update; status panel reflects live change

- Recent events show the full audit chain (intent → applied)

---

## **Next logical task (only one)**

**Next: “Regulator View Mode”** — add a read-only “Regulator” page that shows DPP exports \+ traceability lineage **only when visibility_level and sanctions allow**, proving “Privacy vs Transparency” enforcement end-to-end.

# **Ticket — Regulator View Mode (Read-Only DPP \+ Traceability Lineage with Visibility/Sanctions Gates)**

## **Goal**

Ship a **read-only regulator portal** that proves Doctrine “Privacy vs Transparency” end-to-end:

- Regulators can view **DPP exports** \+ **traceability lineage**

- Only for batches/products that meet:
  - required `visibility_level` thresholds, and/or

  - are unlocked by sanctions / regulatory triggers (Bypass-Wait)

- Portal is **physically read-only** (no writes, no side effects)

- Every regulator view generates a **REGULATOR_ACCESS_LOGGED** event (audit)

---

## **Deliverables**

1. Data model:

- `visibility_level` enum \+ monotonic rules for nodes

- sanctions table (or events-based view) \+ ByPass-Wait mapping

2. Secure read models:

- `dpp_product_passport` view (already exists conceptually)

- `traceability_lineage` view/function (graph walk)

- `regulator_allowed_batches` gate view

3. RLS \+ roles:

- `REGULATOR` role in `org_roles`

- policies ensuring regulators see only what’s allowed

4. Next.js page:

- `/regulator` \+ `/regulator/batch/[id]`

5. Edge function (optional but recommended):

- `regulator_fetch_batch` that:
  - validates regulator role

  - reads allowed views

  - writes audit event

6. Tests:

- visibility gating works

- sanctions gating works

- regulator sees only allowed data

- audit event is written

---

# **A) Data Primitives**

## **1\) Visibility Levels (Monotonic)**

Add enum:

File: `supabase/migrations/090_visibility_enum.sql`

`do $$ begin`  
 `create type public.visibility_level as enum ('anonymous','shielded','public','regulator_ready');`  
`exception when duplicate_object then null; end $$;`

Add to `traceability_nodes`:

File: `supabase/migrations/091_nodes_visibility.sql`

`alter table public.traceability_nodes`  
`add column if not exists visibility public.visibility_level not null default 'anonymous';`

`-- Optional: store a monotonic counter/version for transforms`  
`alter table public.traceability_nodes`  
`add column if not exists version_id bigint not null default 1;`

### **Monotonic enforcement (no downgrades)**

File: `supabase/migrations/092_visibility_monotonic_trigger.sql`

`create or replace function public.enforce_visibility_monotonic()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `-- Only allow same or higher visibility, never lower`  
 `if public.mode_severity( -- reuse, but for visibility we'll map separately`  
 `case new.visibility`  
 `when 'anonymous' then 'normal'::public.platform_mode`  
 `when 'shielded' then 'approval_only'::public.platform_mode`  
 `when 'public' then 'read_only'::public.platform_mode`  
 `when 'regulator_ready' then 'read_only'::public.platform_mode`  
 `end`  
 `) < public.mode_severity(`  
 `case old.visibility`  
 `when 'anonymous' then 'normal'::public.platform_mode`  
 `when 'shielded' then 'approval_only'::public.platform_mode`  
 `when 'public' then 'read_only'::public.platform_mode`  
 `when 'regulator_ready' then 'read_only'::public.platform_mode`  
 `end`  
 `)`  
 `then`  
 `raise exception 'Visibility level cannot be downgraded';`  
 `end if;`

`return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_visibility_monotonic on public.traceability_nodes;`  
`create trigger trg_visibility_monotonic`  
`before update of visibility on public.traceability_nodes`  
`for each row execute function public.enforce_visibility_monotonic();`

If you prefer cleaner logic: create a `visibility_rank()` function instead of the platform_mode hack. (We can do that later; this is fastest path.)

---

## **2\) Sanctions (Bypass-Wait)**

We need a minimal signal that “systemic risk begins,” enabling regulator visibility.

Simplest: `sanctions` table driven by events (already in doctrine).

File: `supabase/migrations/093_sanctions.sql`

`do $$ begin`  
 `create type public.sanction_severity as enum ('low','medium','high','forced_labor_flag');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.sanctions (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `subject_type text not null,          -- 'batch'|'trade'|'org'`  
 `subject_id uuid not null,`  
 `severity public.sanction_severity not null,`  
 `status text not null default 'active' check (status in ('active','cleared')),`  
 `reason text not null,`  
 `created_at timestamptz not null default now(),`  
 `cleared_at timestamptz null`  
`);`

`alter table public.sanctions enable row level security;`

`-- Tenants can see their own sanctions (optional)`  
`create policy "sanctions_read_own_org"`  
`on public.sanctions`  
`for select to authenticated`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`revoke insert, update, delete on public.sanctions from authenticated;`  
`-- Writes via service role / governance RPC only.`

---

# **B) Gate: What Regulators Are Allowed to See**

## **Doctrine Gate Rule (explicit, minimal)**

A regulator can see a batch if ANY is true:

1. `traceability_nodes.visibility` is `regulator_ready` OR `public`

2. There is an **active sanction** of severity `high` or `forced_labor_flag` for that batch/org/trade (Bypass-Wait)

File: `supabase/migrations/094_regulator_gate_views.sql`

`create or replace view public.regulator_allowed_batches as`  
`select`  
 `n.id as batch_id,`  
 `n.org_id,`  
 `n.visibility,`  
 `case`  
 `when n.visibility in ('public','regulator_ready') then true`  
 `when exists (`  
 `select 1 from public.sanctions s`  
 `where s.status = 'active'`  
 `and (`  
 `(s.subject_type = 'batch' and s.subject_id = n.id) or`  
 `(s.subject_type = 'org' and s.subject_id = n.org_id)`  
 `)`  
 `and s.severity in ('high','forced_labor_flag')`  
 `) then true`  
 `else false`  
 `end as regulator_can_view`  
`from public.traceability_nodes n;`

---

# **C) Read Models for Regulator**

## **1\) DPP Export View (existing; ensure it’s gated)**

Modify `dpp_product_passport` to join gate:

File: `supabase/migrations/095_dpp_gated.sql`

`create or replace view public.dpp_product_passport_regulator as`  
`select`  
 `p.*`  
`from public.dpp_product_passport p`  
`join public.regulator_allowed_batches g`  
 `on g.batch_id = p.batch_id`  
`where g.regulator_can_view = true;`

## **2\) Traceability lineage (graph edges)**

Start with a simple lineage view: all edges touching the batch’s node. (Full recursive walk can come next.)

File: `supabase/migrations/096_lineage_gated.sql`

`create or replace view public.traceability_lineage_regulator as`  
`select`  
 `e.*`  
`from public.traceability_edges e`  
`join public.regulator_allowed_batches g`  
 `on g.batch_id = e.to_node_id`  
`where g.regulator_can_view = true;`

Next iteration can add a recursive CTE for upstream lineage; this is the fastest proof.

---

# **D) Regulator Role \+ RLS**

## **Role marker**

Use `org_roles.role = 'REGULATOR'` for regulator orgs.

Add helper:

File: `supabase/migrations/097_regulator_helpers.sql`

`create or replace function public.is_regulator()`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select exists (`  
 `select 1 from public.org_roles r`  
 `where r.user_id = auth.uid()`  
 `and r.role = 'REGULATOR'`  
 `)`  
`$$;`

## **RLS policies on regulator views**

Views don’t have RLS, but underlying tables do. Since these are read-only views, safest is to **query through an Edge function using service role** while enforcing `is_regulator()` and gate conditions in SQL.

That avoids accidentally granting broad table reads to regulators.

So: Regulators do NOT get direct DB read access to base tables; they go through Edge.

---

# **E) Edge Function — Regulator Fetch (read-only \+ audit event)**

## **`regulator_fetch_batch`**

- Verifies user is regulator (`org_roles`)

- Reads from `dpp_product_passport_regulator` and `traceability_lineage_regulator`

- Writes `REGULATOR_ACCESS_LOGGED` event (append-only), including batch_id and why allowed (visibility vs sanction)

File: `supabase/functions/regulator_fetch_batch/index.ts`

`/// <reference lib="deno.ns" />`  
`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`

`function json(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), {`  
 `status,`  
 `headers: { "content-type": "application/json" }`  
 `});`  
`}`

`Deno.serve(async (req) => {`  
 `if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);`

`const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`  
 `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`  
 `const governanceOrgId = Deno.env.get("GOVERNANCE_ORG_ID")!; // for audit org_id`  
 `const systemActorId = Deno.env.get("SYSTEM_ACTOR_ID")!;`

`const authHeader = req.headers.get("Authorization") ?? "";`  
 `const svc = createClient(supabaseUrl, serviceKey, {`  
 `global: { headers: { Authorization: authHeader } }`  
 `});`

`// authenticate user`  
 `const { data: userData, error: userErr } = await svc.auth.getUser();`  
 `if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);`

`const userId = userData.user.id;`

`const body = await req.json().catch(() => null);`  
 `if (!body?.batch_id) return json({ error: "Missing batch_id" }, 400);`  
 `const batchId = body.batch_id as string;`

`// verify regulator role`  
 `const { data: roleRow } = await svc`  
 `.from("org_roles")`  
 `.select("role")`  
 `.eq("user_id", userId)`  
 `.eq("role", "REGULATOR")`  
 `.maybeSingle();`

`if (!roleRow) return json({ error: "Forbidden: regulator role required" }, 403);`

`// fetch gated passport + lineage`  
 `const { data: passport, error: pErr } = await svc`  
 `.from("dpp_product_passport_regulator")`  
 `.select("*")`  
 `.eq("batch_id", batchId)`  
 `.maybeSingle();`

`if (pErr) return json({ error: pErr.message }, 500);`  
 `if (!passport) return json({ error: "Not allowed or not found" }, 404);`

`const { data: lineage, error: lErr } = await svc`  
 `.from("traceability_lineage_regulator")`  
 `.select("*")`  
 `.eq("to_node_id", batchId);`

`if (lErr) return json({ error: lErr.message }, 500);`

`// log access event`  
 `await svc.from("events").insert({`  
 `event_domain: "governance",`  
 `event_type: "REGULATOR_ACCESS_LOGGED",`  
 `org_id: governanceOrgId,`  
 `actor_id: systemActorId,`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: batchId,`  
 `occurred_at: new Date().toISOString(),`  
 `regulator_user_id: userId,`  
 `action: "VIEW_DPP_AND_LINEAGE"`  
 `},`  
 `schema_version: "1.0",`  
 `reasoning_hash: null`  
 `});`

`return json({ ok: true, passport, lineage }, 200);`  
`});`

Add `REGULATOR_ACCESS_LOGGED` schema to schema pack (simple event).

---

# **F) Next.js Regulator Page**

Routes:

- `/regulator` (search by batch ID, list allowed batches optionally)

- `/regulator/batch/[id]` (passport \+ lineage)

Implementation:

- Uses Supabase auth session token

- Calls Next API proxy → Edge `regulator_fetch_batch`

- Renders:
  - passport summary

  - certifications list

  - lineage list (edges)

  - reason banner: “Visible because public/regulator_ready OR sanction present” (we can add this later by returning gate reason)

---

# **G) Tests**

## **Test 1 — Visibility gating**

- batch visibility \= `anonymous`

- no sanctions

- regulator fetch returns 404 (not allowed)

## **Test 2 — Visibility unlock**

- set visibility to `regulator_ready`

- regulator fetch returns 200

## **Test 3 — Sanction unlock (Bypass-Wait)**

- visibility \= `anonymous`

- add active sanction severity `forced_labor_flag` on org/batch via service role

- regulator fetch returns 200

## **Test 4 — Audit event created**

- after fetch, `events` contains `REGULATOR_ACCESS_LOGGED` for batch_id

---

## **Acceptance Criteria**

- Regulator page is read-only and behind regulator role

- DPP \+ lineage shown only when gate allows (visibility or sanctions)

- No direct DB access needed for regulator users (Edge mediated)

- Every view logs an immutable access event

- Tests prove gating \+ audit

---

## **Next logical task (only one)**

**Next: “Recursive Lineage (Upstream Chain Walk) \+ Missing-Edge Invalidation”** — implement a recursive CTE lineage function that returns full upstream custody chain and explicitly flags missing edges that invalidate DPP claims.

# **Ticket — Recursive Lineage (Upstream Chain Walk) \+ Missing-Edge Invalidation (DPP Truth)**

## **Goal**

Upgrade lineage from “edges adjacent to batch” to a **full upstream chain-of-custody walk** that:

1. Returns the complete upstream supply chain graph for a batch (recursive CTE)

2. Detects and flags **missing edges** / broken provenance that **invalidate DPP claims**

3. Produces a regulator-safe **lineage report object**:
   - nodes, edges, depth, cycles detected, missing links, validity boolean

4. Is gated by `regulator_allowed_batches` (Privacy vs Transparency still enforced)

This is the concrete implementation of:  
 **“Missing edges invalidate all downstream DPP claims.”**

---

## **Deliverables**

1. SQL function:

- `public.get_upstream_lineage(batch_id uuid, max_depth int default 25)`
  - returns jsonb report

2. SQL view:

- `public.dpp_lineage_report_regulator` (batch_id → report), gated

3. Update Edge function:

- `regulator_fetch_batch` now calls lineage function and returns report

4. Tests:

- valid chain returns `is_valid=true`

- missing link returns `is_valid=false` \+ missing_links populated

- cycle detection returns `has_cycle=true` and marks invalid (or separate flag)

---

# **A) Canonical “Link Completeness” Rule (explicit)**

A batch’s lineage is **valid** if:

- The upstream graph walk completes without:
  - cycles, and

  - missing required edges for the batch’s declared material transformations

**In v1 implementation (fastest correct):**

- We treat a lineage as invalid if:
  - there are **0 upstream edges** for a non-origin node, OR

  - a walk encounters a node that should have parents but has none, OR

  - we detect a cycle

To avoid inventing transformation semantics prematurely, define:

- `traceability_nodes.node_type` includes at least:
  - `origin` (farm/source) — allowed to have no parents

  - `process` (spinning/weaving/dyeing/etc.) — must have at least one parent

  - `batch` (current material batch) — must have at least one parent unless origin

If you already have different node_type values, map them accordingly.

---

# **B) SQL — Recursive CTE Lineage Function**

File: `supabase/migrations/110_recursive_lineage.sql`

`create or replace function public.get_upstream_lineage(`  
 `p_batch_id uuid,`  
 `p_max_depth int default 25`  
`) returns jsonb`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_report jsonb;`  
`begin`  
 `-- Recursive walk from batch_id going upstream (parents)`  
 `with recursive walk as (`  
 `-- start node`  
 `select`  
 `n.id as node_id,`  
 `n.node_type,`  
 `0 as depth,`  
 `array[n.id] as path`  
 `from public.traceability_nodes n`  
 `where n.id = p_batch_id`

    `union all`

    `-- traverse upstream: from_node -> to_node (child) so parent is from_node`
    `select`
      `parent.id as node_id,`
      `parent.node_type,`
      `w.depth + 1 as depth,`
      `w.path || parent.id`
    `from walk w`
    `join public.traceability_edges e`
      `on e.to_node_id = w.node_id`
    `join public.traceability_nodes parent`
      `on parent.id = e.from_node_id`
    `where w.depth < p_max_depth`
      `and not (parent.id = any(w.path)) -- stop cycles here; we also flag them separately below`

`),`

`-- collect nodes`  
 `nodes as (`  
 `select distinct`  
 `n.id,`  
 `n.org_id,`  
 `n.node_type,`  
 `n.geo_hash,`  
 `n.visibility`  
 `from public.traceability_nodes n`  
 `where n.id in (select node_id from walk)`  
 `),`

`-- collect edges within visited nodes (upstream edges)`  
 `edges as (`  
 `select distinct`  
 `e.from_node_id,`  
 `e.to_node_id,`  
 `e.material_type,`  
 `e.effective_at`  
 `from public.traceability_edges e`  
 `where e.to_node_id in (select node_id from walk)`  
 `and e.from_node_id in (select node_id from walk)`  
 `),`

`-- cycle detection: an upstream parent that already exists in path (blocked above)`  
 `-- detect potential cycle by checking if any edge points to an ancestor already visited`  
 `cycles as (`  
 `select`  
 `e.from_node_id,`  
 `e.to_node_id`  
 `from public.traceability_edges e`  
 `join walk w on w.node_id = e.to_node_id`  
 `where e.from_node_id = any(w.path)`  
 `and w.depth > 0`  
 `limit 1`  
 `),`

`-- missing-edge detection:`  
 `-- any visited node that is not origin-like must have at least one parent edge (to_node_id = node)`  
 `parent_counts as (`  
 `select`  
 `n.id as node_id,`  
 `n.node_type,`  
 `(select count(*) from public.traceability_edges e where e.to_node_id = n.id) as parent_edge_count`  
 `from nodes n`  
 `),`

`missing_links as (`  
 `select`  
 `pc.node_id,`  
 `pc.node_type,`  
 `pc.parent_edge_count`  
 `from parent_counts pc`  
 `where`  
 `-- allow origin-like nodes to have no parents`  
 `not (pc.node_type in ('origin'))`  
 `and pc.parent_edge_count = 0`  
 `)`

`select jsonb_build_object(`  
 `'schema_version', '1.0',`  
 `'batch_id', p_batch_id::text,`  
 `'max_depth', p_max_depth,`  
 `'node_count', (select count(*) from nodes),`  
 `'edge_count', (select count(*) from edges),`  
 `'has_cycle', exists(select 1 from cycles),`  
 `'missing_link_count', (select count(*) from missing_links),`  
 `'missing_links', coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'node_id', ml.node_id::text,`  
 `'node_type', ml.node_type,`  
 `'reason', 'NO_UPSTREAM_EDGE'`  
 `))`  
 `from missing_links ml`  
 `), '[]'::jsonb),`  
 `'nodes', coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'id', n.id::text,`  
 `'org_id', n.org_id::text,`  
 `'node_type', n.node_type,`  
 `'geo_hash', n.geo_hash,`  
 `'visibility', n.visibility::text`  
 `))`  
 `from nodes n`  
 `), '[]'::jsonb),`  
 `'edges', coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'from_node_id', e.from_node_id::text,`  
 `'to_node_id', e.to_node_id::text,`  
 `'material_type', e.material_type,`  
 `'effective_at', e.effective_at`  
 `))`  
 `from edges e`  
 `), '[]'::jsonb),`  
 `'is_valid', (`  
 `not exists(select 1 from cycles)`  
 `and (select count(*) from missing_links) = 0`  
 `)`  
 `)`  
 `into v_report;`

`return v_report;`  
`end;`  
`$$;`

`revoke all on function public.get_upstream_lineage(uuid, int) from authenticated;`

**Notes**

- This is “fastest correct” based on present tables.

- You can refine `node_type` semantics later (e.g., origin types set).

- Uses `security definer` because it’s called from Edge with service role anyway; we revoke from authenticated to avoid direct access.

---

# **C) Regulator-Gated View (Optional)**

File: `supabase/migrations/111_lineage_report_regulator.sql`

`create or replace view public.dpp_lineage_report_regulator as`  
`select`  
 `g.batch_id,`  
 `public.get_upstream_lineage(g.batch_id, 25) as report`  
`from public.regulator_allowed_batches g`  
`where g.regulator_can_view = true;`

---

# **D) Update Edge Function — Return lineage report (single call)**

In `regulator_fetch_batch`, replace the lineage fetch with:

`const { data: lr, error: lrErr } = await svc`  
 `.from("dpp_lineage_report_regulator")`  
 `.select("report")`  
 `.eq("batch_id", batchId)`  
 `.maybeSingle();`

`if (lrErr) return json({ error: lrErr.message }, 500);`  
`if (!lr) return json({ error: "Not allowed or not found" }, 404);`

`return json({ ok: true, passport, lineageReport: lr.report }, 200);`

This keeps the Edge payload structured and keeps recursion in DB.

---

# **E) Tests**

## **Test 1 — Valid chain**

Setup:

- nodes: A(origin) → B(process) → C(batch)

- edges: A→B, B→C  
   Expect:

- `missing_link_count = 0`

- `has_cycle = false`

- `is_valid = true`

## **Test 2 — Missing link invalidates**

Setup:

- node C(batch), node B(process)

- edge missing for B (no parents)  
   Expect:

- `missing_link_count >= 1` includes B

- `is_valid = false`

## **Test 3 — Cycle detection**

Setup:

- edges A→B, B→A (cycle), then B→C  
   Expect:

- `has_cycle = true`

- `is_valid = false`

## **Test 4 — Regulator gating preserved**

- if batch not allowed, view returns no row / Edge returns 404

---

# **Acceptance Criteria**

- Recursive lineage report returns nodes \+ edges \+ validity

- Missing upstream edges produce invalid DPP lineage

- Cycles detected and treated invalid

- Regulator gating still applies (no leakage)

- Regulator page shows “Valid / Invalid” with reasons (missing links / cycle)

- Tests cover valid, missing-link invalid, cycle invalid

---

## **Next logical task (only one)**

**Next: “Transformation Semantics (Material Balance & Batch Splits)”** — add explicit transformation events/tables so lineage validity can enforce not just “has parents” but “correct parents for this transformation” (e.g., yarn→fabric, dye-lot splits, merge/split custody).

# **Ticket — Transformation Semantics (Material Balance, Batch Splits/Merges, Custody-Safe Lineage Validity)**

## **Goal**

Move lineage validation from “edges exist” to “edges are **semantically correct**” by introducing explicit transformation primitives:

- **Transformations**: yarn→fabric, fabric→garment, dyeing, finishing, etc.

- **Material balance**: input quantities must cover output quantities (with loss/yield)

- **Batch splits/merges**: one input → many outputs; many inputs → one output

- **Custody**: transformation must be attributable to an org/site and time-bounded

- **Validity**: DPP lineage is invalid if transformations are missing, unbalanced, or out-of-order

This turns traceability into a **physical accounting system**, not just a graph.

---

## **Deliverables**

1. Canonical tables:

- `material_batches` (canonical batch identity \+ units)

- `batch_transformations` (one transformation event)

- `batch_transformation_inputs` (many)

- `batch_transformation_outputs` (many)

- Optional: `custody_transfers` (if you want separate from transformations)

2. Event types \+ JSON schemas:

- `BATCH_TRANSFORMATION_RECORDED`

- `BATCH_SPLIT_RECORDED`

- `BATCH_MERGE_RECORDED`

- `MATERIAL_BALANCE_VALIDATED`

- `MATERIAL_BALANCE_VIOLATION_DETECTED`

3. DB constraints \+ triggers:

- enforce monotonic time

- enforce nonnegative quantities

- enforce “outputs \<= inputs \* yield” (with tolerance)

- prevent double-spend of input batch quantities (reservation/consumption)

4. Lineage validation upgrade:

- `get_upstream_lineage()` now additionally checks:
  - transformation chain exists for each output batch

  - material balance holds

  - split/merge accounted for

5. Tests (must-have):

- valid transform passes

- output \> input fails

- split consumes correct amount

- merge requires all inputs present

---

# **A) Canonical Data Model (SQL)**

File: `supabase/migrations/120_transformation_tables.sql`

`-- Units in textiles vary. Start with a controlled enum.`  
`do $$ begin`  
 `create type public.quantity_unit as enum ('kg','m','pcs');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.batch_state as enum ('active','consumed','void');`  
`exception when duplicate_object then null; end $$;`

`do $$ begin`  
 `create type public.transformation_type as enum (`  
 `'spinning','weaving','knitting','dyeing','printing','finishing','cutting','sewing','packing',`  
 `'split','merge','relabel'`  
 `);`  
`exception when duplicate_object then null; end $$;`

`-- Canonical batch table (separate from traceability_nodes if needed)`  
`create table if not exists public.material_batches (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `sku_id uuid null,`  
 `material_type text not null,                 -- 'cotton_yarn_30s', 'greige_fabric', etc.`  
 `unit public.quantity_unit not null,`  
 `quantity_total numeric not null check (quantity_total >= 0),`  
 `quantity_available numeric not null check (quantity_available >= 0),`  
 `state public.batch_state not null default 'active',`  
 `created_at timestamptz not null default now(),`  
 `effective_at timestamptz not null default now(),`  
 `superseded_at timestamptz null,`  
 `version_id bigint not null default 1`  
`);`

`-- One transformation record (links org/site/time)`  
`create table if not exists public.batch_transformations (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `transformation_type public.transformation_type not null,`  
 `occurred_at timestamptz not null,`  
 `site_id uuid null,  -- optional: factory/location entity later`  
 `trade_id uuid null references public.trades(id),`  
 `notes text null,`  
 `created_at timestamptz not null default now()`  
`);`

`-- Inputs (many-to-one)`  
`create table if not exists public.batch_transformation_inputs (`  
 `transformation_id uuid not null references public.batch_transformations(id) on delete cascade,`  
 `batch_id uuid not null references public.material_batches(id),`  
 `unit public.quantity_unit not null,`  
 `quantity numeric not null check (quantity > 0),`  
 `primary key (transformation_id, batch_id)`  
`);`

`-- Outputs (many-to-one)`  
`create table if not exists public.batch_transformation_outputs (`  
 `transformation_id uuid not null references public.batch_transformations(id) on delete cascade,`  
 `batch_id uuid not null references public.material_batches(id),`  
 `unit public.quantity_unit not null,`  
 `quantity numeric not null check (quantity > 0),`  
 `primary key (transformation_id, batch_id)`  
`);`

### **Why separate `material_batches` from `traceability_nodes`?**

- `traceability_nodes` is the graph identity and visibility container

- `material_batches` is the **accounting unit** with quantities \+ availability  
   You can still keep them 1:1 by storing `traceability_nodes.batch_id` \= `material_batches.id`.

---

# **B) Material Balance Enforcement (Triggers)**

## **Rule (v1, unit-consistent)**

For each transformation:

- All input units must match, all output units must match, and input unit \= output unit (v1 simplification)

- `sum(outputs) <= sum(inputs) * yield_factor`

- yield_factor defaults to 1.0 unless provided

Add yield fields:

File: `supabase/migrations/121_transformation_balance.sql`

`alter table public.batch_transformations`  
`add column if not exists yield_factor numeric not null default 1.0 check (yield_factor > 0 and yield_factor <= 1.2),`  
`add column if not exists tolerance numeric not null default 0.0001 check (tolerance >= 0);`

`create or replace function public.enforce_material_balance()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`declare`  
 `v_in numeric;`  
 `v_out numeric;`  
 `v_yield numeric;`  
 `v_tol numeric;`  
 `v_unit_in public.quantity_unit;`  
 `v_unit_out public.quantity_unit;`  
`begin`  
 `-- fetch yield/tolerance`  
 `select yield_factor, tolerance into v_yield, v_tol`  
 `from public.batch_transformations`  
 `where id = coalesce(new.transformation_id, old.transformation_id);`

`-- input totals`  
 `select`  
 `sum(quantity),`  
 `min(unit),`  
 `max(unit)`  
 `into v_in, v_unit_in, v_unit_out`  
 `from public.batch_transformation_inputs`  
 `where transformation_id = coalesce(new.transformation_id, old.transformation_id);`

`if v_unit_in is null then`  
 `return new;`  
 `end if;`

`-- ensure all input units consistent`  
 `if exists (`  
 `select 1 from public.batch_transformation_inputs`  
 `where transformation_id = coalesce(new.transformation_id, old.transformation_id)`  
 `group by transformation_id`  
 `having count(distinct unit) > 1`  
 `) then`  
 `raise exception 'Material balance: inconsistent input units';`  
 `end if;`

`-- output totals`  
 `select`  
 `sum(quantity)`  
 `into v_out`  
 `from public.batch_transformation_outputs`  
 `where transformation_id = coalesce(new.transformation_id, old.transformation_id);`

`-- outputs optional until provided`  
 `if v_out is null then`  
 `return new;`  
 `end if;`

`-- ensure output units consistent and match inputs (v1)`  
 `if exists (`  
 `select 1 from public.batch_transformation_outputs`  
 `where transformation_id = coalesce(new.transformation_id, old.transformation_id)`  
 `group by transformation_id`  
 `having count(distinct unit) > 1`  
 `) then`  
 `raise exception 'Material balance: inconsistent output units';`  
 `end if;`

`if exists (`  
 `select 1`  
 `from public.batch_transformation_outputs o`  
 `where o.transformation_id = coalesce(new.transformation_id, old.transformation_id)`  
 `and o.unit <> v_unit_in`  
 `) then`  
 `raise exception 'Material balance: output unit must match input unit in v1';`  
 `end if;`

`-- enforce balance`  
 `if v_out > (v_in * v_yield + v_tol) then`  
 `raise exception 'Material balance violated: outputs % exceed inputs % * yield %', v_out, v_in, v_yield;`  
 `end if;`

`return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_balance_inputs on public.batch_transformation_inputs;`  
`create trigger trg_balance_inputs`  
`after insert or update or delete on public.batch_transformation_inputs`  
`for each row execute function public.enforce_material_balance();`

`drop trigger if exists trg_balance_outputs on public.batch_transformation_outputs;`  
`create trigger trg_balance_outputs`  
`after insert or update or delete on public.batch_transformation_outputs`  
`for each row execute function public.enforce_material_balance();`

---

# **C) Prevent Double-Spend of Inputs (Consume availability)**

When a transformation is “finalized” (outputs present), decrement `quantity_available` from each input batch.

To keep it deterministic, add a `finalized_at` column \+ finalize RPC.

File: `supabase/migrations/122_transformation_finalize.sql`

`alter table public.batch_transformations`  
`add column if not exists finalized_at timestamptz null;`

`create or replace function public.finalize_transformation(p_transformation_id uuid)`  
`returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_org uuid;`  
 `v_inputs record;`  
 `v_in_total numeric;`  
 `v_out_total numeric;`  
`begin`  
 `-- must have outputs`  
 `select sum(quantity) into v_out_total`  
 `from public.batch_transformation_outputs`  
 `where transformation_id = p_transformation_id;`

`if v_out_total is null or v_out_total <= 0 then`  
 `raise exception 'Cannot finalize: no outputs recorded';`  
 `end if;`

`-- lock transformation row`  
 `update public.batch_transformations`  
 `set finalized_at = coalesce(finalized_at, now())`  
 `where id = p_transformation_id`  
 `returning org_id into v_org;`

`-- consume inputs (lock rows)`  
 `for v_inputs in`  
 `select batch_id, quantity`  
 `from public.batch_transformation_inputs`  
 `where transformation_id = p_transformation_id`  
 `loop`  
 `update public.material_batches`  
 `set quantity_available = quantity_available - v_inputs.quantity,`  
 `version_id = version_id + 1`  
 `where id = v_inputs.batch_id`  
 `and quantity_available >= v_inputs.quantity;`

    `if not found then`
      `raise exception 'Insufficient available quantity for input batch %', v_inputs.batch_id;`
    `end if;`

    `-- mark consumed if zero`
    `update public.material_batches`
    `set state = 'consumed'`
    `where id = v_inputs.batch_id`
      `and quantity_available <= 0;`

`end loop;`

`return;`  
`end;`  
`$$;`

`revoke all on function public.finalize_transformation(uuid) from authenticated;`

Finalize should be called by Edge service-role worker after schema validation \+ maker–checker (if needed for high-stakes).

---

# **D) Event Types \+ JSON Schemas (Schema Pack)**

## **Core events**

- `BATCH_TRANSFORMATION_RECORDED` (transformation created \+ inputs/outputs)

- `TRANSFORMATION_FINALIZED`

- `MATERIAL_BALANCE_VIOLATION_DETECTED` (emitted by app if finalize fails)

- `BATCH_SPLIT_RECORDED` (alias of transformation_type='split')

- `BATCH_MERGE_RECORDED` (alias of transformation_type='merge')

Minimal payload for `BATCH_TRANSFORMATION_RECORDED`:

`{`  
 `"schema_version":"1.0",`  
 `"subject_id":"<transformation_id>",`  
 `"occurred_at":"...",`  
 `"org_id":"...",`  
 `"transformation_type":"weaving",`  
 `"inputs":[{"batch_id":"...","unit":"kg","quantity":100}],`  
 `"outputs":[{"batch_id":"...","unit":"kg","quantity":98}],`  
 `"yield_factor":0.98`  
`}`

---

# **E) Upgrade Lineage Validity (Next function change)**

Modify `get_upstream_lineage()` to:

- For each batch node in the walk:
  - confirm there is a transformation record producing it (unless origin)

- Validate that transformation inputs exist and are upstream-connected

- If batch produced by split/merge:
  - ensure all required input batches are present and quantities accounted

This is the “semantic validity” layer.

---

# **Tests (Must-have)**

1. `weaving` transformation balanced: 100 in → 98 out finalize succeeds

2. violation: 100 in → 110 out finalize fails

3. split: 100 in → 60 out \+ 40 out finalize ok; availability decreases correctly

4. merge: 60 \+ 40 in → 98 out finalize ok

5. lineage validity:
   - batch without producing transformation (non-origin) \= invalid

   - batch produced but missing upstream inputs in graph \= invalid

---

# **Acceptance Criteria**

- Transformations represent batch splits/merges explicitly

- Material balance enforced in DB (outputs cannot exceed inputs \* yield)

- Input batches cannot be double-spent (availability decreases on finalize)

- Lineage validity can assert semantic correctness (not just edge existence)

- Tests cover balance, splits, merges, invalid provenance

---

## **Next logical task (only one)**

**Next: “Transformation RPC \+ Event-First Write Path”** — implement `record_transformation()` Edge function that validates JSON schema, writes transformation \+ inputs/outputs, emits `BATCH_TRANSFORMATION_RECORDED`, then calls `finalize_transformation()`—all behind domain guards and maker–checker thresholds.

# **Ticket — Transformation RPC \+ Event-First Write Path (`record_transformation`) (Schema → DB Write → Event → Finalize)**

## **Goal**

Implement the canonical write path for transformations (yarn→fabric, dyeing, split/merge, etc.):

1. Validate payload against `BATCH_TRANSFORMATION_RECORDED` schema (Ajv)

2. Enforce org scoping \+ domain kill-switch guards (`domain=trade` or `compliance` depending)

3. Enforce maker–checker for irreversible/high-value transformations (threshold-based)

4. Atomically write:
   - `batch_transformations`

   - `batch_transformation_inputs`

   - `batch_transformation_outputs`

5. Emit immutable `BATCH_TRANSFORMATION_RECORDED` event into `events` ledger

6. Call `finalize_transformation(transformation_id)` to consume inputs \+ lock material balance

This makes transformation truth **event-first and physically enforced**.

---

## **Deliverables**

- Shared schema pack:
  - `BATCH_TRANSFORMATION_RECORDED.v1.json`

  - `TRANSFORMATION_FINALIZED.v1.json`

- Edge function:
  - `/functions/v1/record_transformation`

- DB RPC (recommended for atomicity):
  - `public.create_transformation_from_payload(payload jsonb) returns uuid`

- Update lineage validity to require producing transformations (follow-up already planned)

- Tests:
  - valid transform succeeds (event \+ rows \+ finalize)

  - invalid schema rejected

  - material balance violation rejected (no partial writes)

  - kill-switch blocks when trade domain frozen

  - maker-checker required for irreversible thresholds

---

# **A) Canonical Schemas (Schema Pack)**

## **1\) `BATCH_TRANSFORMATION_RECORDED.v1.json`**

`{`  
 `"$id": "texqtic.trade.BATCH_TRANSFORMATION_RECORDED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version","subject_id","occurred_at","transformation_type","inputs","outputs"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" },`  
 `"transformation_type": {`  
 `"type": "string",`  
 `"enum": ["spinning","weaving","knitting","dyeing","printing","finishing","cutting","sewing","packing","split","merge","relabel"]`  
 `},`  
 `"site_id": { "type": "string", "format": "uuid" },`  
 `"trade_id": { "type": "string", "format": "uuid" },`  
 `"yield_factor": { "type": "number", "minimum": 0.0, "maximum": 1.2 },`  
 `"tolerance": { "type": "number", "minimum": 0.0 },`  
 `"inputs": {`  
 `"type": "array",`  
 `"minItems": 1,`  
 `"items": {`  
 `"type": "object",`  
 `"required": ["batch_id","unit","quantity"],`  
 `"properties": {`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"unit": { "type": "string", "enum": ["kg","m","pcs"] },`  
 `"quantity": { "type": "number", "exclusiveMinimum": 0 }`  
 `},`  
 `"additionalProperties": false`  
 `}`  
 `},`  
 `"outputs": {`  
 `"type": "array",`  
 `"minItems": 1,`  
 `"items": {`  
 `"type": "object",`  
 `"required": ["batch_id","unit","quantity"],`  
 `"properties": {`  
 `"batch_id": { "type": "string", "format": "uuid" },`  
 `"unit": { "type": "string", "enum": ["kg","m","pcs"] },`  
 `"quantity": { "type": "number", "exclusiveMinimum": 0 }`  
 `},`  
 `"additionalProperties": false`  
 `}`  
 `}`  
 `},`  
 `"additionalProperties": false`  
`}`

## **2\) `TRANSFORMATION_FINALIZED.v1.json`**

`{`  
 `"$id": "texqtic.trade.TRANSFORMATION_FINALIZED.v1",`  
 `"type": "object",`  
 `"required": ["schema_version","subject_id","occurred_at"],`  
 `"properties": {`  
 `"schema_version": { "const": "1.0" },`  
 `"subject_id": { "type": "string", "format": "uuid" },`  
 `"occurred_at": { "type": "string", "format": "date-time" }`  
 `},`  
 `"additionalProperties": false`  
`}`

---

# **B) DB RPC for Atomic Creation (Recommended)**

**Why:** Deno Edge \+ Supabase inserts across multiple tables are hard to make truly atomic.  
 Best practice: Edge validates → calls a single DB function that does all inserts in one transaction.

File: `supabase/migrations/130_create_transformation_rpc.sql`

`create or replace function public.create_transformation_from_payload(p jsonb)`  
`returns uuid`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_org uuid;`  
 `v_actor uuid;`  
 `v_id uuid;`  
 `v_occurred timestamptz;`  
 `v_type public.transformation_type;`  
 `v_yield numeric;`  
 `v_tol numeric;`  
 `v_site uuid;`  
 `v_trade uuid;`  
 `in_item jsonb;`  
 `out_item jsonb;`  
`begin`  
 `v_actor := auth.uid();`  
 `if v_actor is null then raise exception 'Unauthorized'; end if;`

`v_org := (auth.jwt() ->> 'org_id')::uuid;`  
 `if v_org is null then raise exception 'Missing org_id'; end if;`

`-- Domain guard (treat transformations as trade domain)`  
 `perform public.require_not_frozen(`  
 `'create_transformation_from_payload',`  
 `(p->>'subject_id')::uuid,`  
 `v_org,`  
 `v_actor,`  
 `null,`  
 `'trade'`  
 `);`

`v_occurred := (p->>'occurred_at')::timestamptz;`  
 `v_type := (p->>'transformation_type')::public.transformation_type;`

`v_yield := coalesce((p->>'yield_factor')::numeric, 1.0);`  
 `v_tol := coalesce((p->>'tolerance')::numeric, 0.0001);`

`v_site := nullif(p->>'site_id','')::uuid;`  
 `v_trade := nullif(p->>'trade_id','')::uuid;`

`v_id := (p->>'subject_id')::uuid;`

`insert into public.batch_transformations (`  
 `id, org_id, transformation_type, occurred_at, site_id, trade_id, yield_factor, tolerance`  
 `) values (`  
 `v_id, v_org, v_type, v_occurred, v_site, v_trade, v_yield, v_tol`  
 `);`

`-- inputs`  
 `for in_item in select jsonb_array_elements(p->'inputs')`  
 `loop`  
 `insert into public.batch_transformation_inputs (transformation_id, batch_id, unit, quantity)`  
 `values (`  
 `v_id,`  
 `(in_item->>'batch_id')::uuid,`  
 `(in_item->>'unit')::public.quantity_unit,`  
 `(in_item->>'quantity')::numeric`  
 `);`  
 `end loop;`

`-- outputs`  
 `for out_item in select jsonb_array_elements(p->'outputs')`  
 `loop`  
 `insert into public.batch_transformation_outputs (transformation_id, batch_id, unit, quantity)`  
 `values (`  
 `v_id,`  
 `(out_item->>'batch_id')::uuid,`  
 `(out_item->>'unit')::public.quantity_unit,`  
 `(out_item->>'quantity')::numeric`  
 `);`  
 `end loop;`

`return v_id;`  
`end;`  
`$$;`

`grant execute on function public.create_transformation_from_payload(jsonb) to authenticated;`

Material balance triggers will auto-fire on insert into inputs/outputs.

---

# **C) Edge Function — `record_transformation` (Schema \+ Maker–Checker \+ Event \+ Finalize)**

## **Maker–Checker thresholds (fastest disciplined)**

Define irreversible threshold rules (configurable later):

- If `sum(inputs.quantity) >= 5000` (or value-based once you have price) → require checker

- If `transformation_type in ('merge')` → require checker (higher fraud risk)

- If tenant domain is `approval_only` → checker is always required (already enforced by guard if you pass checker)

### **Endpoint contract**

`POST /functions/v1/record_transformation`

Body:

`{`  
 `event_type: "BATCH_TRANSFORMATION_RECORDED",`  
 `payload: { ...schema... },`  
 `checker_id?: string,`  
 `reasoning_hash?: string`  
`}`

File: `supabase/functions/record_transformation/index.ts`

`/// <reference lib="deno.ns" />`  
`import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`  
`import { validateEventOrThrow } from "../_shared/schemaPack.ts"; // shared schema pack (Next + Edge)`

`function jsonResponse(body: unknown, status = 200) {`  
 `return new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json" } });`  
`}`

`function sumQty(items: Array<{ quantity: number }>) {`  
 `return items.reduce((a, x) => a + (typeof x.quantity === "number" ? x.quantity : 0), 0);`  
`}`

`Deno.serve(async (req) => {`  
 `if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);`

`const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`  
 `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`  
 `const governanceOrgId = Deno.env.get("GOVERNANCE_ORG_ID")!;`  
 `const systemActorId = Deno.env.get("SYSTEM_ACTOR_ID")!;`

`const authHeader = req.headers.get("Authorization") ?? "";`  
 `const svc = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });`

`const { data: userData, error: userErr } = await svc.auth.getUser();`  
 `if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);`  
 `const makerId = userData.user.id;`

`const body = await req.json().catch(() => null);`  
 `if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);`

`const eventType = body.event_type;`  
 `const payload = body.payload;`  
 `const checkerId = body.checker_id ?? null;`  
 `const reasoningHash = body.reasoning_hash ?? null;`

`if (eventType !== "BATCH_TRANSFORMATION_RECORDED") {`  
 `return jsonResponse({ error: "Unsupported event_type" }, 400);`  
 `}`

`// 1) schema validation`  
 `try {`  
 `validateEventOrThrow(eventType, payload);`  
 `} catch (e) {`  
 `return jsonResponse({ error: "Schema validation failed", details: String(e) }, 422);`  
 `}`

`// 2) maker–checker thresholds`  
 `const inTotal = sumQty(payload.inputs ?? []);`  
 `const requiresChecker =`  
 `(payload.transformation_type === "merge") ||`  
 `(inTotal >= 5000);`

`if (requiresChecker) {`  
 `if (!checkerId) return jsonResponse({ error: "Checker required for this transformation" }, 422);`

    `if (checkerId === makerId) return jsonResponse({ error: "Maker–Checker violation" }, 422);`

    `// Must have CHECKER_APPROVAL for this transformation`
    `const { data: approval } = await svc`
      `.from("events")`
      `.select("id")`
      `.eq("event_domain", "governance")`
      `.eq("event_type", "CHECKER_APPROVAL")`
      `.contains("payload", { subject_id: payload.subject_id })`
      `.limit(1);`

    `if (!approval || approval.length === 0) {`
      `return jsonResponse({ error: "CHECKER_APPROVAL missing for transformation" }, 422);`
    `}`

`}`

`// 3) DB atomic create via RPC (user-scoped so JWT org applies)`  
 `const userScoped = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });`

`const { data: transformationId, error: createErr } = await userScoped.rpc("create_transformation_from_payload", {`  
 `p: payload`  
 `});`

`if (createErr) return jsonResponse({ error: createErr.message }, 422);`

`// 4) emit BATCH_TRANSFORMATION_RECORDED to events ledger (service role, governance org)`  
 `// Prefer org_id = maker org_id; but events.org_id is tenant org in your model.`  
 `// Use tenant org from JWT by querying auth JWT claim via userScoped or pass it in payload.`  
 `// Fastest: write org_id = (auth.jwt org) is not available here; so read from a cheap query:`  
 `const { data: orgRow } = await userScoped.rpc("get_my_org_id", {}); // if exists; otherwise fetch from a profile table`  
 `const orgId = orgRow ?? governanceOrgId; // fallback only if needed (better to implement get_my_org_id)`

`const insertEvent = await svc.from("events").insert({`  
 `event_domain: "trade",`  
 `event_type: "BATCH_TRANSFORMATION_RECORDED",`  
 `org_id: orgId,`  
 `actor_id: systemActorId,`  
 `payload: { ...payload, maker_id: makerId, checker_id: checkerId ?? undefined },`  
 `schema_version: "1.0",`  
 `reasoning_hash: reasoningHash`  
 `});`

`if (insertEvent.error) return jsonResponse({ error: insertEvent.error.message }, 500);`

`// 5) finalize transformation (consumes inputs, enforces availability)`  
 `const { error: finErr } = await svc.rpc("finalize_transformation", { p_transformation_id: transformationId });`  
 `if (finErr) return jsonResponse({ error: finErr.message }, 422);`

`// 6) emit finalized event`  
 `await svc.from("events").insert({`  
 `event_domain: "trade",`  
 `event_type: "TRANSFORMATION_FINALIZED",`  
 `org_id: orgId,`  
 `actor_id: systemActorId,`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: transformationId,`  
 `occurred_at: new Date().toISOString()`  
 `},`  
 `schema_version: "1.0",`  
 `reasoning_hash: null`  
 `});`

`return jsonResponse({ ok: true, transformation_id: transformationId }, 200);`  
`});`

### **Important (to avoid drift): `get_my_org_id`**

Add a tiny SQL helper so Edge can obtain the tenant org_id consistently from JWT in DB:

File: `supabase/migrations/131_get_my_org_id.sql`

`create or replace function public.get_my_org_id()`  
`returns uuid`  
`language sql`  
`stable`  
`as $$`  
 `select (auth.jwt() ->> 'org_id')::uuid`  
`$$;`

`grant execute on function public.get_my_org_id() to authenticated;`

---

# **D) Domain Guards & Kill-Switch Compliance**

- DB RPC already calls `require_not_frozen(..., domain='trade')`

- If you want transformations treated as compliance domain for certain types (e.g., certification transformations), map types → domain at Edge and call a compliance RPC.

For now: keep all transformations in `trade` domain to stay consistent with custody/accounting.

---

# **E) Tests (E2E)**

## **Test 1 — Success**

- Create batches with sufficient availability

- POST record_transformation

- Assert:
  - `batch_transformations` row exists

  - inputs/outputs exist

  - `material_batches.quantity_available` decreased

  - `events` contains:
    - `BATCH_TRANSFORMATION_RECORDED`

    - `TRANSFORMATION_FINALIZED`

## **Test 2 — Schema invalid**

- missing outputs → 422 schema validation

## **Test 3 — Balance violation**

- outputs \> inputs \* yield → 422, and DB has no partial state (verify no transformation row)

## **Test 4 — Kill-switch blocks**

- Activate domain=trade read_only, apply

- record_transformation → 422 kill-switch

## **Test 5 — Maker–checker required**

- payload input total \>= threshold

- without checker_id → 422

- with checker_id but without CHECKER_APPROVAL → 422

- with approval event → success

---

# **Acceptance Criteria**

- Schema validation rejects malformed transformation payloads

- DB writes are atomic (no partial inputs/outputs on failure)

- Material balance \+ availability enforced by DB finalize

- Governance constraints enforced (kill-switch \+ maker–checker)

- Events ledger records transformation and finalization

---

## **Next logical task (only one)**

**Next: “Transformation-to-Traceability Graph Projection”** — automatically project transformations into `traceability_nodes`/`traceability_edges` (or assert 1:1 mapping), so lineage uses the accounting truth and DPP exports reflect transformations without manual edge creation.

doctrine_v1_4_part_3_EXECUTABLE.md
